import React from 'react';
import HomeScreenMinimal from './screens/HomeScreenMinimal';

export default function MinimalNavigator({ user }) {
  // Simple navigator that just renders the HomeScreenMinimal directly
  return <HomeScreenMinimal user={user} />;
}