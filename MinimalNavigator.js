import React from 'react';
import HomeScreen from './screens/HomeScreen';

export default function MinimalNavigator({ user }) {
  // Simple navigator that renders the redesigned HomeScreen
  return <HomeScreen user={user} />;
}