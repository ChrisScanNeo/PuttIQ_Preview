import React from 'react';
import HomeScreenSimplified from '../screens/HomeScreenSimplified';

// Minimal navigator that just shows the home screen
export default function MinimalNavigator({ user }) {
  return <HomeScreenSimplified user={user} />;
}