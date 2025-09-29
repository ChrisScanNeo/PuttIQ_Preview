import React from 'react';
import HomeScreenVideo from './screens/HomeScreenVideo';

export default function MinimalNavigator({ user }) {
  // Simple navigator that renders the video-based HomeScreen
  return <HomeScreenVideo user={user} />;
}