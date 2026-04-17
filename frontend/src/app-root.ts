import { LitElement, css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'

import { createApiClient } from './api/client'
import { navigate, normalizeRoute } from './router'

import './pages/admin-dashboard-page'
import './pages/public-booking-page'

@customElement('app-root')
export class AppRoot extends LitElement {
  private readonly apiClient = createApiClient()

  @state()
  private route = normalizeRoute(window.location.pathname)

  connectedCallback(): void {
    super.connectedCallback()
    if (
      window.location.pathname !== '/public' &&
      window.location.pathname !== '/admin'
    ) {
      navigate('/public')
    }
    window.addEventListener('popstate', this.handlePopState)
  }

  disconnectedCallback(): void {
    window.removeEventListener('popstate', this.handlePopState)
    super.disconnectedCallback()
  }

  private handlePopState = (): void => {
    this.route = normalizeRoute(window.location.pathname)
  }

  private handleRouteChange(route: '/public' | '/admin'): void {
    navigate(route)
  }

  render() {
    return html`
      <main class="layout">
        <header class="header">
          <div>
            <h1>Calendar Booking</h1>
            <p>UI на Lit + Shoelace по текущему TypeSpec-контракту.</p>
          </div>

          <nav class="nav">
            <sl-button
              variant=${this.route === '/public' ? 'primary' : 'default'}
              @click=${() => this.handleRouteChange('/public')}
            >
              Public
            </sl-button>
            <sl-button
              variant=${this.route === '/admin' ? 'primary' : 'default'}
              @click=${() => this.handleRouteChange('/admin')}
            >
              Admin
            </sl-button>
          </nav>
        </header>

        ${this.route === '/admin'
          ? html`<admin-dashboard-page
              .apiClient=${this.apiClient}
            ></admin-dashboard-page>`
          : html`<public-booking-page
              .apiClient=${this.apiClient}
            ></public-booking-page>`}
      </main>
    `
  }

  static styles = css`
    :host {
      color: #0f172a;
      display: block;
      font-family:
        Inter,
        system-ui,
        -apple-system,
        Segoe UI,
        sans-serif;
      min-height: 100vh;
    }

    .layout {
      box-sizing: border-box;
      margin: 0 auto;
      max-width: 1100px;
      padding: 1.25rem;
    }

    .header {
      align-items: start;
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .header h1 {
      margin: 0;
    }

    .header p {
      color: #475569;
      margin: 0.35rem 0 0;
    }

    .nav {
      display: flex;
      gap: 0.5rem;
    }
  `
}

declare global {
  interface HTMLElementTagNameMap {
    'app-root': AppRoot
  }
}
