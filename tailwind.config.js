/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        'primary-container': '#4f46e5',
        'on-primary': '#ffffff',
        'on-primary-container': '#dad7ff',
        'inverse-primary': '#c3c0ff',

        secondary: 'var(--color-secondary)',
        'secondary-container': '#6cf8bb',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#00714d',

        tertiary: '#684000',
        'tertiary-container': '#885500',
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#ffd4a4',

        error: '#ba1a1a',
        'error-container': '#ffdad6',
        'on-error': '#ffffff',
        'on-error-container': '#93000a',

        surface: '#fcf8ff',
        'surface-dim': '#dcd8e5',
        'surface-bright': '#fcf8ff',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f5f2ff',
        'surface-container': '#f0ecf9',
        'surface-container-high': '#eae6f4',
        'surface-container-highest': '#e4e1ee',
        'surface-variant': '#e4e1ee',
        'surface-tint': '#4d44e3',

        'on-surface': '#1b1b24',
        'on-surface-variant': '#464555',
        'inverse-surface': '#302f39',
        'inverse-on-surface': '#f3effc',

        outline: '#777587',
        'outline-variant': '#c7c4d8',

        background: '#fcf8ff',
        'on-background': '#1b1b24',

        // Status badge colors (venta estados)
        'status-presupuesto': { bg: '#F3F4F6', text: '#374151' },
        'status-confirmado': { bg: '#DBEAFE', text: '#1E40AF' },
        'status-preparacion': { bg: '#FEF3C7', text: '#92400E' },
        'status-entregado': { bg: '#EDE9FE', text: '#5B21B6' },
        'status-facturado': { bg: '#FFEDD5', text: '#9A3412' },
        'status-cobrado': { bg: '#DCFCE7', text: '#166534' },
        'status-cancelado': { bg: '#FEE2E2', text: '#991B1B' },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      fontSize: {
        'headline-lg': ['30px', { lineHeight: '38px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-md': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-sm': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'label-md': ['14px', { lineHeight: '20px', fontWeight: '500' }],
        'label-sm': ['12px', { lineHeight: '16px', fontWeight: '600', letterSpacing: '0.05em' }],
      },
      spacing: {
        sidebar: '280px',
        'sidebar-collapsed': '80px',
        'container-max': '1440px',
        gutter: '24px',
        'gutter-mobile': '16px',
      },
      borderRadius: {
        sm: '0.125rem',
        DEFAULT: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
      boxShadow: {
        card: '0 0 0 1px #E5E7EB',
        modal: '0px 4px 6px -1px rgba(0,0,0,0.1), 0 0 0 1px #E5E7EB',
      },
    },
  },
  plugins: [],
}
