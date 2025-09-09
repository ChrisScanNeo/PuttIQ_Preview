import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Text, View, SafeAreaView } from 'react-native';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import ProfileManagerScreen from '../screens/ProfileManagerScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

// Tab bar icon component
const TabBarIcon = ({ name, color }) => {
  const icons = {
    Home: '🏌️',
    Profiles: '🎯',
    Settings: '⚙️'
  };
  
  return (
    <Text style={{ fontSize: 24, color }}>{icons[name] || '?'}</Text>
  );
};

export default function AppNavigator({ user }) {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color }) => (
            <TabBarIcon name={route.name} color={color} />
          ),
          tabBarActiveTintColor: '#2E7D32',
          tabBarInactiveTintColor: 'gray',
          headerShown: true,
          headerStyle: {
            backgroundColor: '#2E7D32',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          tabBarStyle: {
            paddingBottom: 5,
            paddingTop: 5,
          },
        })}
      >
        <Tab.Screen 
          name="Home" 
          options={{ 
            title: 'PuttIQ Practice',
            tabBarLabel: 'Practice'
          }}
        >
          {(props) => <HomeScreen {...props} user={user} />}
        </Tab.Screen>
        
        <Tab.Screen 
          name="Profiles" 
          component={ProfileManagerScreen}
          options={{ 
            title: 'Sound Profiles',
            tabBarLabel: 'Profiles'
          }}
          initialParams={{ user }}
        />
        
        <Tab.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{ 
            title: 'Settings',
            tabBarLabel: 'Settings'
          }}
          initialParams={{ user }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}