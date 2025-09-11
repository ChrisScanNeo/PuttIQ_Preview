import React from 'react';
// Use the minimal version matching the UI mockup
import HomeScreenMinimal from '../screens/HomeScreenMinimal';
// import HomeScreenEnhanced from '../screens/HomeScreenEnhanced';
// import HomeScreenSimplified from '../screens/HomeScreenSimplified';

// Minimal navigator that just shows the home screen
export default function MinimalNavigator({ user }) {
  return <HomeScreenMinimal user={user} />;
}