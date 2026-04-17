import { LitElement, css, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

import { createApiClient } from '../api/client'
import type { ApiError } from '../api/errors'
import { isSlotConflict } from '../api/errors'
import type { ApiClient, EventType, Slot } from '../types/api'
import { formatDateTime, getDefaultWindow } from '../utils/date'
import { getValidationMessage, parseBookingPayload } from '../utils/validation'

@customElement('public-booking-page')
export class PublicBookingPage extends LitElement {
  @property({ attribute: false })
  apiClient: ApiClient = createApiClient()

  @state()
  private eventTypes: EventType[] = []

  @state()
  private slots: Slot[] = []

  @state()
  private selectedEventTypeId = ''

  @state()
  private selectedSlotStartAt = ''

  @state()
  private guestName = ''

  @state()
  private guestEmail = ''

  @state()
  private isLoading = true

  @state()
  private isSubmitting = false

  @state()
  private errorMessage = ''

  @state()
  private successMessage = ''

  connectedCallback(): void {
    super.connectedCallback()
    void this.loadInitialData()
  }

  private async loadInitialData(): Promise<void> {
    this.isLoading = true
    this.errorMessage = ''

    try {
      this.eventTypes = await this.apiClient.listPublicEventTypes()
      this.selectedEventTypeId = this.eventTypes[0]?.id ?? ''
      if (this.selectedEventTypeId) {
        await this.loadSlots(this.selectedEventTypeId)
      }
    } catch (error) {
      this.errorMessage = this.getErrorMessage(error)
    } finally {
      this.isLoading = false
    }
  }

  private async loadSlots(eventTypeId: string): Promise<void> {
    this.errorMessage = ''
    const windowRange = getDefaultWindow()

    try {
      this.slots = await this.apiClient.listPublicSlots(
        eventTypeId,
        windowRange.from,
        windowRange.to
      )
      this.selectedSlotStartAt = this.availableSlots[0]?.startAt ?? ''
    } catch (error) {
      this.errorMessage = this.getErrorMessage(error)
    }
  }

  private handleEventTypeChange(event: Event): void {
    const target = event.target as HTMLSelectElement
    this.selectedEventTypeId = target.value
    this.selectedSlotStartAt = ''
    void this.loadSlots(target.value)
  }

  private handleSlotSelect(startAt: string): void {
    this.selectedSlotStartAt = startAt
    this.successMessage = ''
  }

  private handleGuestNameInput(event: Event): void {
    const target = event.target as HTMLInputElement
    this.guestName = target.value
  }

  private handleGuestEmailInput(event: Event): void {
    const target = event.target as HTMLInputElement
    this.guestEmail = target.value
  }

  private async handleSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault()
    this.errorMessage = ''
    this.successMessage = ''
    this.isSubmitting = true

    try {
      const payload = parseBookingPayload({
        eventTypeId: this.selectedEventTypeId,
        slotStartAt: this.selectedSlotStartAt,
        guestName: this.guestName,
        guestEmail: this.guestEmail
      })
      await this.apiClient.createPublicBooking(payload)
      this.successMessage = 'Бронирование успешно создано.'
      this.guestName = ''
      this.guestEmail = ''
      await this.loadSlots(this.selectedEventTypeId)
    } catch (error) {
      const apiError = this.toApiError(error)
      if (isSlotConflict(apiError)) {
        this.errorMessage =
          'Слот уже заняли. Обновили список слотов, выберите другой интервал.'
        await this.loadSlots(this.selectedEventTypeId)
      } else {
        this.errorMessage = this.getErrorMessage(error)
      }
    } finally {
      this.isSubmitting = false
    }
  }

  private get availableSlots(): Slot[] {
    return this.slots.filter((slot) => slot.isAvailable)
  }

  private toApiError(error: unknown): ApiError | null {
    if (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      'code' in error &&
      'message' in error
    ) {
      return error as ApiError
    }

    return null
  }

  private getErrorMessage(error: unknown): string {
    const apiError = this.toApiError(error)
    if (apiError) {
      return `${apiError.message} (${apiError.code})`
    }

    return getValidationMessage(error)
  }

  render() {
    if (this.isLoading) {
      return html`
        <section class="state-wrapper">
          <sl-spinner></sl-spinner>
          <p>Загружаем данные для бронирования...</p>
        </section>
      `
    }

    return html`
      <sl-card>
        <h2 slot="header">Публичное бронирование</h2>

        <div class="stack">
          ${this.errorMessage
            ? html`<sl-alert variant="danger" open
                >${this.errorMessage}</sl-alert
              >`
            : null}
          ${this.successMessage
            ? html`<sl-alert variant="success" open
                >${this.successMessage}</sl-alert
              >`
            : null}

          <label class="field">
            Тип события
            <select
              name="eventType"
              .value=${this.selectedEventTypeId}
              @change=${this.handleEventTypeChange}
            >
              ${this.eventTypes.map(
                (eventType) => html`
                  <option value=${eventType.id}>
                    ${eventType.name} (${eventType.durationMinutes} мин)
                  </option>
                `
              )}
            </select>
          </label>

          <section class="slots">
            <h3>Доступные слоты (14 дней)</h3>
            ${this.availableSlots.length === 0
              ? html`<p class="helper">Свободные слоты не найдены.</p>`
              : html`
                  <div class="slot-grid">
                    ${this.availableSlots.map(
                      (slot) => html`
                        <button
                          type="button"
                          class=${slot.startAt === this.selectedSlotStartAt
                            ? 'slot active'
                            : 'slot'}
                          @click=${() => this.handleSlotSelect(slot.startAt)}
                        >
                          ${formatDateTime(slot.startAt)}
                        </button>
                      `
                    )}
                  </div>
                `}
          </section>

          <form class="stack" @submit=${this.handleSubmit}>
            <label class="field">
              Имя гостя
              <input
                name="guestName"
                type="text"
                .value=${this.guestName}
                @input=${this.handleGuestNameInput}
                required
              />
            </label>

            <label class="field">
              Email гостя
              <input
                name="guestEmail"
                type="email"
                .value=${this.guestEmail}
                @input=${this.handleGuestEmailInput}
                required
              />
            </label>

            <sl-button
              variant="primary"
              type="submit"
              ?disabled=${this.isSubmitting || !this.selectedSlotStartAt}
            >
              ${this.isSubmitting ? 'Создаем...' : 'Забронировать'}
            </sl-button>
          </form>
        </div>
      </sl-card>
    `
  }

  static styles = css`
    .stack {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      font-weight: 600;
    }

    select,
    input {
      border: 1px solid #d0d7de;
      border-radius: 0.5rem;
      font: inherit;
      padding: 0.55rem 0.65rem;
    }

    .slots {
      border: 1px solid #d0d7de;
      border-radius: 0.75rem;
      padding: 1rem;
    }

    .slot-grid {
      display: grid;
      gap: 0.5rem;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      margin-top: 0.75rem;
    }

    .slot {
      border: 1px solid #d0d7de;
      border-radius: 0.5rem;
      background: #fff;
      cursor: pointer;
      font: inherit;
      padding: 0.45rem 0.5rem;
      text-align: left;
    }

    .slot.active {
      border-color: #3b82f6;
      box-shadow: inset 0 0 0 1px #3b82f6;
    }

    .helper {
      color: #4b5563;
      margin: 0;
    }

    .state-wrapper {
      align-items: center;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      justify-content: center;
      min-height: 220px;
    }
  `
}

declare global {
  interface HTMLElementTagNameMap {
    'public-booking-page': PublicBookingPage
  }
}
