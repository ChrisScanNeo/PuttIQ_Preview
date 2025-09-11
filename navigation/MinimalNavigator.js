import React from 'react';
// Use the enhanced version with new UI components
import HomeScreenEnhanced from '../screens/HomeScreenEnhanced';
// import HomeScreenSimplified from '../screens/HomeScreenSimplified';

// Minimal navigator that just shows the home screen
export default function MinimalNavigator({ user }) {
  return <HomeScreenEnhanced user={user} />;
}