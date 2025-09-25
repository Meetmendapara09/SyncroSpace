# Firebase Authentication Setup for SyncroSpace

Follow these steps to properly configure Firebase Authentication for the SyncroSpace application:

## Authorized Domains

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Authentication** → **Settings** → **Authorized domains**
4. Add the following domains:
   - `syncro-space.vercel.app`
   - `localhost`
   - Any other domains where your application is deployed

## Configure Authentication Methods

1. Go to **Authentication** → **Sign-in method**
2. Enable the authentication methods used by your application:
   - Email/Password
   - Google
   - Any other providers you need

## Security Rules

The Firestore security rules are configured to work with the authentication system. Make sure they're properly deployed to your Firebase project:

```bash
firebase deploy --only firestore:rules
```

## Environment Variables

Ensure your application has the correct Firebase configuration in the environment variables. For Next.js applications deployed to Vercel, add these in your project settings:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Testing Authentication

After making these changes, test the authentication flow to ensure it works correctly:

1. Sign out if currently signed in
2. Try to sign in with your preferred method
3. Verify that you can access authenticated routes
4. Check the browser console for any authentication-related errors

## Troubleshooting

If you encounter authentication issues:

- Clear browser cookies and cache
- Verify that the domain is correctly added in the Firebase Console
- Check that the environment variables are correctly set
- Look for CORS errors in the browser console