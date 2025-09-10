import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import ProfileManagerScreen from '../screens/ProfileManagerScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PutterCalibrationScreen from '../screens/PutterCalibrationScreen';

// Simple tab navigator without external dependencies
export default function SimpleNavigator({ user }) {
  const [activeTab, setActiveTab] = useState('Home');
  const [activeScreen, setActiveScreen] = useState('Home');
  const [screenParams, setScreenParams] = useState({});

  // Navigation function for screens to use
  const navigation = {
    navigate: (screenName, params = {}) => {
      setActiveScreen(screenName);
      setScreenParams(params);
    },
    goBack: () => {
      setActiveScreen(activeTab);
      setScreenParams({});
    }
  };

  const renderScreen = () => {
    // Check if we're showing a modal/sub-screen
    if (activeScreen !== activeTab) {
      switch (activeScreen) {
        case 'PutterCalibration':
          return <PutterCalibrationScreen 
            navigation={navigation} 
            route={{ params: screenParams }} 
          />;
        default:
          break;
      }
    }

    // Show tab screens
    switch (activeTab) {
      case 'Home':
        return <HomeScreen user={user} />;
      case 'Profiles':
        return <ProfileManagerScreen route={{ params: { user } }} />;
      case 'Settings':
        return <SettingsScreen 
          route={{ params: { user } }} 
          navigation={navigation}
        />;
      default:
        return <HomeScreen user={user} />;
    }
  };

  const TabButton = ({ name, label, icon }) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === name && styles.activeTab]}
      onPress={() => {
        setActiveTab(name);
        setActiveScreen(name);
      }}
    >
      <Text style={[styles.tabIcon, activeTab === name && styles.activeTabText]}>
        {icon}
      </Text>
      <Text style={[styles.tabLabel, activeTab === name && styles.activeTabText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PuttIQ - {activeTab}</Text>
      </View>
      
      <View style={styles.content}>
        {renderScreen()}
      </View>

      <View style={styles.tabBar}>
        <TabButton name="Home" label="Practice" icon="🏌️" />
        <TabButton name="Profiles" label="Profiles" icon="🎯" />
        <TabButton name="Settings" label="Settings" icon="⚙️" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#2E7D32',
    paddingVertical: 10,
    paddingHorizontal: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 5,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    backgroundColor: '#f0f0f0',
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    color: '#666',
  },
  activeTabText: {
    color: '#2E7D32',
    fontWeight: '600',
  },
});