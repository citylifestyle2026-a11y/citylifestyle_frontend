import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Provider } from 'react-redux'
import { store } from './redux/store.js'
import { initAutoCapitalize } from './utilits/autoCapitalize.js'

// Site-wide: capitalizes the first letter of every word as the user
// types, in every text input/textarea across the site. See
// utilits/autoCapitalize.js for how/why this is wired up globally
// instead of per-form.
initAutoCapitalize()

createRoot(document.getElementById('root')).render(
    <Provider store={store}>
     <App />
    </Provider>
)
