# Firebase Realtime Database Rules for SyncroSpace

This document explains the Firebase Realtime Database rules for the SyncroSpace application. These rules are designed to secure the database while allowing the virtual office and chat functionality to work properly.

## Structure

The database has the following main sections:

1. **users** - User status and related information
2. **rooms** - Virtual meeting rooms
3. **publicRooms** - Public listings for discoverable rooms
4. **rtcSignaling** - WebRTC signaling for peer connections

## Rule Explanations

### Users

This section contains user presence information, status, and settings:

- Only authenticated users can read user data
- Users can only write to their own data
- Admins can write to any user's data

```json
"users": {
  "$uid": {
    ".read": "auth !== null",
    ".write": "$uid === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'admin'"
  }
}
```

### Rooms

This section contains virtual meeting rooms, their members, and chat messages:

- Only authenticated users can read room data
- Users can create new rooms
- Users can only modify rooms they are members of
- Room creators and admins have elevated privileges

```json
"rooms": {
  ".read": "auth !== null",
  "$roomId": {
    ".read": "auth !== null",
    ".write": "auth !== null && (data.child('members').child(auth.uid).exists() || !data.exists() || root.child('users').child(auth.uid).child('role').val() === 'admin')"
  }
}
```

#### Messages

Each room has two types of messages:

1. **Global** - Messages visible to all room members
2. **Proximity** - Messages only visible to users within proximity range

Messages can only be read and written by room members, and the userId must match the authenticated user.

```json
"messages": {
  "global": {
    "$messageId": {
      ".validate": "newData.hasChildren(['userId', 'username', 'message', 'timestamp'])",
      "userId": {
        ".validate": "newData.val() === auth.uid"
      }
    }
  }
}
```

#### Zone Activity

This tracks user movement through different zones in the virtual office:

```json
"zoneActivity": {
  "$zoneId": {
    ".read": "auth !== null && data.parent().parent().child('members').child(auth.uid).exists()",
    ".write": "auth !== null && data.parent().parent().child('members').child(auth.uid).exists()"
  }
}
```

### RTC Signaling

This section handles WebRTC signaling for peer-to-peer video and audio connections:

- Each session has offers, answers, candidates, and participants
- Rules ensure users can only read/write their own signaling data
- Session participants can read all signaling data for their session

## Installation Instructions

1. Log in to your Firebase console at [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Realtime Database** in the left sidebar
4. Click on the **Rules** tab
5. Copy and paste the contents of `database-rules.json` into the rules editor
6. Click **Publish** to apply the rules

## Security Considerations

- All rules require authentication (`auth !== null`)
- Users can only modify their own data or data they have explicit access to
- Validation rules ensure proper data structure
- Room members can only access rooms they have joined
- Message creators must match their auth ID

## Testing

To test these rules:

1. Use the Firebase Realtime Database Rules Simulator
2. Set up test cases for each path and operation
3. Verify access is granted or denied as expected

## Maintenance

These rules should be reviewed and updated when:

1. Adding new features that use the Realtime Database
2. Changing the structure of existing features
3. Modifying access control requirements