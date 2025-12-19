export const environment = {
    production: false,
    apiUrl: 'http://localhost:5289/api', // Backend runs on port 5289

    googleClientId: '330056808594-7m8k48fm0s673e7cgvt1t80443vd4qdv.apps.googleusercontent.com', // Example: '123456789-abcdefghijklmnop.apps.googleusercontent.com'
    
    // Stripe publishable key (safe to keep client-side). Get it from Stripe Dashboard.
    stripePublicKey: 'pk_test_51SdpV1ERwO8ZNvg8eO9JnMkfERiYsdHjMN6JixygQOwtVKSCnP3alf6um7sPGv8qYkJW48wr2TDagGpuXUkGUkAs00Qj4oaONW',
    
    // NEVER commit secret API keys to the frontend.
    // For production, keep Groq on the backend only (recommended), or inject a non-secret key at build time.
    groqApiKey: ''
  };
