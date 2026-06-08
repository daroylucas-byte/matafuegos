import { Sentry } from './lib/sentry'
import { AppRouter } from './router'

function App() {
  return (
    <Sentry.ErrorBoundary fallback={<p>Algo salió mal. Por favor recargá la página.</p>}>
      <AppRouter />
    </Sentry.ErrorBoundary>
  )
}

export default App
