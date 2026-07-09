// Main email module exports
export * from './templates'
export * from './notifications'
export * from './utils'
 
// Re-export the main email transporter and contact functionality
export { default as transporter } from '../email'
export { sendContactEmail } from '../email' 