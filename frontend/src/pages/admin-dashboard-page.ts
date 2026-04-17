import { LitElement, css, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

import { createApiClient } from '../api/client'
import type { ApiClient, Booking, EventType, Owner } from '../types/api'
import { formatDateTime, toUtcFromLocalInput } from '../utils/date'
import {
  getValidationMessage,
  parseEventTypePayload
} from '../utils/validation'

@customElement('admin-dashboard-page')
export class AdminDashboardPage extends LitElement {
  @property({ attribute: false })
  apiClient: ApiClient = createApiClient()

  @state()
  private owner: Owner | null = null

  @state()
  private eventTypes: EventType[] = []

  @state()
  private bookings: Booking[] = []

  @state()
  private isLoading = true

  @state()
  private isSubmitting = false

  @state()
  private errorMessage = ''

  @state()
  private successMessage = ''

  @state()
  private fromFilter = ''

  @state()
  private toFilter = ''

  @state()
  private createForm = {
    id: '',
    name: '',
    description: '',
    durationMinutes: '30'
  }

  connectedCallback(): void {
    super.connectedCallback()
    void this.loadDashboard()
  }

  private async loadDashboard(): Promise<void> {
    this.isLoading = true
    this.errorMessage = ''

    try {
      const [owner, eventTypes, bookings] = await Promise.all([
        this.apiClient.getDefaultOwner(),
        this.apiClient.listAdminEventTypes(),
        this.apiClient.listUpcomingBookings()
      ])

      this.owner = owner
      this.eventTypes = eventTypes
      this.bookings = bookings
    } catch (error) {
      this.errorMessage = this.getErrorMessage(error)
    } finally {
      this.isLoading = false
    }
  }

  private handleCreateFormInput(event: Event): void {
    const target = event.target as HTMLInputElement
    this.createForm = {
      ...this.createForm,
      [target.name]: target.value
    }
  }

  private handleFilterInput(event: Event): void {
    const target = event.target as HTMLInputElement
    if (target.name === 'fromFilter') {
      this.fromFilter = target.value
      return
    }

    this.toFilter = target.value
  }

  private async handleCreateEventType(event: SubmitEvent): Promise<void> {
    event.preventDefault()
    this.errorMessage = ''
    this.successMessage = ''
    this.isSubmitting = true

    try {
      const payload = parseEventTypePayload(this.createForm)
      const eventType = await this.apiClient.createAdminEventType(payload)
      this.eventTypes = [...this.eventTypes, eventType]
      this.createForm = {
        id: '',
        name: '',
        description: '',
        durationMinutes: '30'
      }
      this.successMessage = `Тип события ${eventType.name} создан.`
    } catch (error) {
      this.errorMessage = this.getErrorMessage(error)
    } finally {
      this.isSubmitting = false
    }
  }

  private async handleLoadFilteredBookings(event: SubmitEvent): Promise<void> {
    event.preventDefault()
    this.errorMessage = ''

    const from = this.fromFilter
      ? toUtcFromLocalInput(this.fromFilter)
      : undefined
    const to = this.toFilter ? toUtcFromLocalInput(this.toFilter) : undefined

    try {
      this.bookings = await this.apiClient.listUpcomingBookings(from, to)
    } catch (error) {
      this.errorMessage = this.getErrorMessage(error)
    }
  }

  private getErrorMessage(error: unknown): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      'code' in error
    ) {
      const apiError = error as { message: string; code: string }
      return `${apiError.message} (${apiError.code})`
    }

    return getValidationMessage(error)
  }

  render() {
    if (this.isLoading) {
      return html`
        <section class="state-wrapper">
          <sl-spinner></sl-spinner>
          <p>Загружаем административные данные...</p>
        </section>
      `
    }

    return html`
      <section class="stack">
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

        <sl-card>
          <h2 slot="header">Профиль владельца</h2>
          ${this.owner
            ? html`
                <p><strong>ID:</strong> ${this.owner.id}</p>
                <p><strong>Имя:</strong> ${this.owner.displayName}</p>
                <p><strong>Timezone:</strong> ${this.owner.timezone}</p>
                <p>
                  <strong>Профиль по умолчанию:</strong>
                  ${this.owner.isDefaultProfile ? 'Да' : 'Нет'}
                </p>
              `
            : html`<p>Данные владельца недоступны.</p>`}
        </sl-card>

        <sl-card>
          <h2 slot="header">Типы событий</h2>
          <ul class="list">
            ${this.eventTypes.map(
              (eventType) => html`
                <li>
                  <strong>${eventType.name}</strong>
                  <span>${eventType.id}</span>
                  <span>${eventType.durationMinutes} минут</span>
                </li>
              `
            )}
          </ul>

          <form class="stack" @submit=${this.handleCreateEventType}>
            <h3>Создать новый тип</h3>
            <label class="field">
              ID
              <input
                name="id"
                type="text"
                .value=${this.createForm.id}
                @input=${this.handleCreateFormInput}
                required
              />
            </label>
            <label class="field">
              Название
              <input
                name="name"
                type="text"
                .value=${this.createForm.name}
                @input=${this.handleCreateFormInput}
                required
              />
            </label>
            <label class="field">
              Описание
              <input
                name="description"
                type="text"
                .value=${this.createForm.description}
                @input=${this.handleCreateFormInput}
                required
              />
            </label>
            <label class="field">
              Длительность (минуты)
              <input
                name="durationMinutes"
                type="number"
                min="5"
                .value=${this.createForm.durationMinutes}
                @input=${this.handleCreateFormInput}
                required
              />
            </label>
            <sl-button
              variant="primary"
              type="submit"
              ?disabled=${this.isSubmitting}
            >
              ${this.isSubmitting ? 'Сохраняем...' : 'Создать тип события'}
            </sl-button>
          </form>
        </sl-card>

        <sl-card>
          <h2 slot="header">Предстоящие бронирования</h2>
          <form class="filter-grid" @submit=${this.handleLoadFilteredBookings}>
            <label class="field">
              От
              <input
                name="fromFilter"
                type="datetime-local"
                .value=${this.fromFilter}
                @input=${this.handleFilterInput}
              />
            </label>
            <label class="field">
              До
              <input
                name="toFilter"
                type="datetime-local"
                .value=${this.toFilter}
                @input=${this.handleFilterInput}
              />
            </label>
            <sl-button variant="neutral" type="submit">
              Обновить список
            </sl-button>
          </form>

          ${this.bookings.length === 0
            ? html`<p>Бронирования не найдены.</p>`
            : html`
                <table>
                  <thead>
                    <tr>
                      <th>Слот</th>
                      <th>Тип события</th>
                      <th>Гость</th>
                      <th>Email</th>
                      <th>Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${this.bookings.map(
                      (booking) => html`
                        <tr>
                          <td>${formatDateTime(booking.slotStartAt)}</td>
                          <td>${booking.eventTypeId}</td>
                          <td>${booking.guestName}</td>
                          <td>${booking.guestEmail}</td>
                          <td>
                            <sl-badge
                              variant=${booking.status === 'confirmed'
                                ? 'success'
                                : 'neutral'}
                            >
                              ${booking.status}
                            </sl-badge>
                          </td>
                        </tr>
                      `
                    )}
                  </tbody>
                </table>
              `}
        </sl-card>
      </section>
    `
  }

  static styles = css`
    .stack {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .list {
      display: grid;
      gap: 0.75rem;
      list-style: none;
      margin: 0 0 1rem;
      padding: 0;
    }

    .list li {
      border: 1px solid #d0d7de;
      border-radius: 0.6rem;
      display: grid;
      gap: 0.2rem;
      padding: 0.65rem 0.75rem;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      font-weight: 600;
    }

    input {
      border: 1px solid #d0d7de;
      border-radius: 0.5rem;
      font: inherit;
      padding: 0.55rem 0.65rem;
    }

    .filter-grid {
      align-items: end;
      display: grid;
      gap: 0.75rem;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      margin-bottom: 1rem;
    }

    table {
      border-collapse: collapse;
      width: 100%;
    }

    th,
    td {
      border-bottom: 1px solid #d0d7de;
      padding: 0.45rem 0.25rem;
      text-align: left;
      vertical-align: top;
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
    'admin-dashboard-page': AdminDashboardPage
  }
}
