import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const savedLanguage = localStorage.getItem('language') || 'en';

const resources = {
  en: {
    translation: {
      app: {
        name: 'ChargePilot AI',
        tagline: 'Your Smart EV Charging Companion'
      },
      nav: {
        dashboard: 'Dashboard',
        tripPlanner: 'Trip Planner',
        stations: 'Stations',
        analytics: 'Analytics',
        profile: 'Profile',
        owner: 'Owner Dashboard',
        admin: 'Admin Panel',
        logout: 'Logout'
      },
      auth: {
        login: 'Login',
        register: 'Register',
        email: 'Email',
        password: 'Password',
        name: 'Full Name',
        phone: 'Phone Number',
        city: 'City',
        welcomeBack: 'Welcome Back!',
        createAccount: 'Create Account',
        alreadyHaveAccount: 'Already have an account?',
        dontHaveAccount: "Don't have an account?",
        loginSuccess: 'Login successful!',
        registerSuccess: 'Registration successful!'
      },
      dashboard: {
        welcome: 'Welcome',
        quickStats: 'Quick Stats',
        batteryStatus: 'Battery Status',
        estimatedRange: 'Estimated Range',
        totalTrips: 'Total Trips',
        chargingSessions: 'Charging Sessions',
        nearbyStations: 'Nearby Stations',
        recentTrips: 'Recent Trips',
        quickActions: 'Quick Actions',
        planTrip: 'Plan a Trip',
        findStations: 'Find Stations',
        viewAnalytics: 'View Analytics'
      },
      tripPlanner: {
        title: 'Trip Planner',
        origin: 'Starting Point',
        destination: 'Destination',
        currentBattery: 'Current Battery',
        selectVehicle: 'Select Vehicle',
        checkFeasibility: 'Check Route',
        calculating: 'Calculating...',
        reachable: 'Route is Reachable!',
        chargingRequired: 'Charging Required',
        distance: 'Distance',
        predictedRange: 'Predicted Range',
        arrivalBattery: 'Arrival Battery',
        recommendedStation: 'Recommended Station',
        chargeTo: 'Charge to',
        estimatedTime: 'Estimated Time',
        estimatedCost: 'Estimated Cost',
        startNavigation: 'Start Navigation'
      },
      stations: {
        title: 'Charging Stations',
        search: 'Search stations...',
        filters: 'Filters',
        verifiedOnly: 'Verified Only',
        minHealthScore: 'Min Health Score',
        nearMe: 'Near Me',
        allStations: 'All Stations',
        verified: 'Verified',
        available: 'Available',
        healthScore: 'Health Score',
        rating: 'Rating',
        reviews: 'Reviews',
        viewDetails: 'View Details',
        getDirections: 'Get Directions',
        connectorTypes: 'Connector Types',
        powerOutput: 'Power Output',
        pricing: 'Pricing'
      },
      profile: {
        title: 'Profile',
        personalInfo: 'Personal Information',
        vehicleInfo: 'Vehicle Information',
        addVehicle: 'Add Vehicle',
        editProfile: 'Edit Profile',
        save: 'Save Changes'
      },
      common: {
        loading: 'Loading...',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        close: 'Close',
        confirm: 'Confirm',
        error: 'Error',
        success: 'Success',
        km: 'km',
        kwh: 'kWh',
        minutes: 'min',
        rupees: '₹',
        percent: '%'
      }
    }
  },
  hi: {
    translation: {
      app: {
        name: 'चार्जपायलट AI',
        tagline: 'आपका स्मार्ट EV चार्जिंग साथी'
      },
      nav: {
        dashboard: 'डैशबोर्ड',
        tripPlanner: 'यात्रा योजनाकार',
        stations: 'स्टेशन',
        analytics: 'विश्लेषण',
        profile: 'प्रोफ़ाइल',
        logout: 'लॉग आउट'
      },
      common: {
        loading: 'लोड हो रहा है...',
        save: 'सहेजें',
        cancel: 'रद्द करें',
        km: 'किमी',
        rupees: '₹'
      }
    }
  },
  gu: {
    translation: {
      app: {
        name: 'ચાર્જપાઇલટ AI',
        tagline: 'તમારો સ્માર્ટ EV ચાર્જિંગ સાથી'
      },
      nav: {
        dashboard: 'ડેશબોર્ડ',
        tripPlanner: 'ટ્રિપ પ્લાનર',
        stations: 'સ્ટેશનો',
        profile: 'પ્રોફાઇલ',
        logout: 'લોગઆઉટ'
      },
      common: {
        loading: 'લોડ થઈ રહ્યું છે...',
        save: 'સાચવો',
        km: 'કિમી',
        rupees: '₹'
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;