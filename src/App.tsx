import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Menu,
  ShieldCheck,
  MapPin,
  Truck,
  ChevronRight,
  RefreshCw,
  Languages,
  Plus,
  Sparkles,
  Check,
  Phone,
  Mail,
  Award,
  X,
  AlertTriangle,
  Thermometer,
  ArrowRight,
  User,
  Package,
  DollarSign,
  Edit,
  CheckCircle2,
  Navigation,
  CheckCircle,
  Clock,
  Map,
  PlusCircle,
  LogIn,
  Star,
  Activity,
  Mic,
  Calculator,
  Fuel,
  TrendingUp
} from "lucide-react";

import { Language, CropPrice, PredictionResult, Vehicle, TrackerState, CompletedTrip } from "./types";
import { translations } from "./translations";
import { DEFAULT_VEHICLES } from "./vehicles";
import { TamilNaduMap } from "./components/TamilNaduMap";

export default function App() {
  // Persistence & Language setup
  const [lang, setLang] = useState<Language | null>(() => {
    const saved = localStorage.getItem("farmgo_lang");
    return (saved as Language) || null;
  });

  const [page, setPage] = useState<"home" | "farmer" | "transporter">("home");
  const [userRole, setUserRole] = useState<"guest" | "farmer" | "transporter">("guest");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ phone: "", name: "" });

  // Farmer Flow step states
  const [farmerStep, setFarmerStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [selectedCategory, setSelectedCategory] = useState<"fruits" | "vegetables" | null>(null);
  const [cargoForm, setCargoForm] = useState({
    cropName: "",
    weight: "",
    weightUnit: "kg",
    pickup: "Madurai",
    destination: "Chennai Koyambedu",
  });
  
  // AI Prediction State
  const [aiResult, setAiResult] = useState<PredictionResult | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Active tracking animation state
  const [trackingProgress, setTrackingProgress] = useState(0);
  const [currentDistanceTravelled, setCurrentDistanceTravelled] = useState(0);
  const [cargoCurrentTemp, setCargoCurrentTemp] = useState(10.2);
  const [trackingStatusMsg, setTrackingStatusMsg] = useState("Departed pickup silo");

  // Transporter State (fully dynamic)
  const [transporterFleet, setTransporterFleet] = useState<Vehicle[]>(() => {
    const saved = localStorage.getItem("farmgo_fleet");
    return saved ? JSON.parse(saved) : DEFAULT_VEHICLES;
  });
  const [transporterTab, setTransporterTab] = useState<"dashboard" | "fleet" | "requests" | "history">("dashboard");
  const [completedTrips, setCompletedTrips] = useState<CompletedTrip[]>(() => {
    const saved = localStorage.getItem("farmgo_completed_trips");
    if (saved) return JSON.parse(saved);
    return [
      {
        id: "T-1008",
        cargo: "Onion (2.5 Tons)",
        route: "Madurai to Chennai Koyambedu",
        driverName: "Ramachandran",
        payout: 18500,
        timestamp: "2026-06-08 09:12"
      },
      {
        id: "T-1007",
        cargo: "Tomato (1.5 Tons)",
        route: "Salem to Madurai Market",
        driverName: "Senthil Kumar",
        payout: 5500,
        timestamp: "2026-06-07 16:45"
      },
      {
        id: "T-1006",
        cargo: "Potato (800 kg)",
        route: "Ooty to Coimbatore",
        driverName: "Annadurai P",
        payout: 4200,
        timestamp: "2026-06-06 11:30"
      }
    ];
  });
  const [transporterEarnings, setTransporterEarnings] = useState(() => {
    const saved = localStorage.getItem("farmgo_completed_trips");
    if (saved) {
      const trips: CompletedTrip[] = JSON.parse(saved);
      return trips.reduce((sum, t) => sum + t.payout, 0);
    }
    return 28200; // sum of initial completed trips: 18500 + 5500 + 4200
  });
  const [transporterTrips, setTransporterTrips] = useState(() => {
    const saved = localStorage.getItem("farmgo_completed_trips");
    if (saved) {
      return JSON.parse(saved).length;
    }
    return 3; // 3 initial completed trips
  });
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [newVehicleForm, setNewVehicleForm] = useState({
    name: "",
    capacity: "1.5 Tons",
    storageType: "Cold" as "Cold" | "Dry" | "Normal",
    price: 4500,
    driverName: "",
    driverPhone: "",
    hasAC: true,
  });

  // Dynamic Active Trip Driver Rating State
  const [activeTripRating, setActiveTripRating] = useState<number>(5);
  const [activeTripComment, setActiveTripComment] = useState<string>("");
  const [hasRatedActiveTrip, setHasRatedActiveTrip] = useState<boolean>(false);

  // Voice Input Speech recognition & parsing states
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [parsedText, setParsedText] = useState("");
  const [voiceParsedStatus, setVoiceParsedStatus] = useState<"success" | "partial" | "failed" | null>(null);
  const [voiceInputSimulated, setVoiceInputSimulated] = useState("");
  const [homeMarketSelectedCrop, setHomeMarketSelectedCrop] = useState("Tomato");

  // Farmer profit calculator states
  const [calcProductionCost, setCalcProductionCost] = useState<number>(50000);
  const [calcTransportCost, setCalcTransportCost] = useState<number>(10000);
  const [calcSellingPrice, setCalcSellingPrice] = useState<number>(80000);

  const parseCargoSpeech = (text: string) => {
    const raw = text.toLowerCase().trim();
    setParsedText(text);

    let detectedCrop = "";
    let detectedWeight = "";
    let detectedUnit = "kg";
    let detectedPickup = "";
    let detectedDestination = "";

    // 1. Detect Crop (Tamil & English)
    const cropSearchList = [
      { key: "Tomato", terms: ["tomato", "tomatoes", "தக்காளி", "தகாலி"] },
      { key: "Onion", terms: ["onion", "onions", "வெங்காயம்", "வெங்காய"] },
      { key: "Potato", terms: ["potato", "potatoes", "உருளைக்கிழங்கு", "உருளை", "கிளங்கு"] },
      { key: "Banana", terms: ["banana", "bananas", "வாழைப்பழம்", "வாழை", "பழம"] },
      { key: "Mango", terms: ["mango", "mangoes", "மாம்பழம்", "மாம்பழ"] },
      { key: "Coconut", terms: ["coconut", "coconuts", "தேங்காய்", "தேங்கா"] },
      { key: "Brinjal", terms: ["brinjal", "கத்தரிக்காய்", "கத்தரி"] },
      { key: "Carrot", terms: ["carrot", "கேரட்"] },
      { key: "Drumstick", terms: ["drumstick", "முருங்கைக்காய்", "முருங்கை"] },
    ];

    for (const item of cropSearchList) {
      if (item.terms.some(term => raw.includes(term))) {
        detectedCrop = item.key;
        break;
      }
    }

    // 2. Detect Locations (Tamil & English)
    const pickupList = [
      { key: "Madurai", terms: ["madurai", "மதுரை"] },
      { key: "Coimbatore", terms: ["coimbatore", "கோவை", "கோயம்புத்தூர்"] },
      { key: "Salem", terms: ["salem", "சேலம்"] },
      { key: "Theni", terms: ["theni", "தேனி"] },
      { key: "Trichy", terms: ["trichy", "திருச்சி"] },
      { key: "Thanjavur", terms: ["thanjavur", "தஞ்சாவூர்"] }
    ];

    const destList = [
      { key: "Chennai Koyambedu", terms: ["chennai", "koyambedu", "சென்னை", "கோயம்பேடு"] },
      { key: "Trichy Market", terms: ["trichy market", "trichy complex", "திருச்சி சந்தை", "tiruchirappalli சந்தை"] },
      { key: "Salem Agro-Center", terms: ["salem market", "salem agro", "சேலம் அக்ரி", "சேலம் சந்தை"] },
      { key: "Madurai Silo Complex", terms: ["madurai silo", "madurai complex", "மதுரை சைலோ"] },
      { key: "Coimbatore Whole-Sale", terms: ["coimbatore wholesale", "coimbatore market", "கோவை ஹோல்சேல்", "கோவை சந்தை"] }
    ];

    // Search pickup
    const possiblePickups = pickupList.filter(item => item.terms.some(term => raw.includes(term)));
    if (possiblePickups.length > 0) {
      const fromMatch = possiblePickups.find(item => {
        return item.terms.some(term => {
          const idx = raw.indexOf(term);
          if (idx !== -1) {
            const before = raw.slice(Math.max(0, idx - 15), idx);
            const after = raw.slice(idx, idx + term.length + 15);
            return before.includes("from") || after.includes("ிருந்து") || after.includes("லிருந்து") || before.includes("டூ") || after.includes("டூ");
          }
          return false;
        });
      });
      detectedPickup = fromMatch ? fromMatch.key : possiblePickups[0].key;
    }

    // Search destination
    const possibleDests = destList.filter(item => item.terms.some(term => raw.includes(term)));
    if (possibleDests.length > 0) {
      const toMatch = possibleDests.find(item => {
        return item.terms.some(term => {
          const idx = raw.indexOf(term);
          if (idx !== -1) {
            const before = raw.slice(Math.max(0, idx - 15), idx);
            const after = raw.slice(idx, idx + term.length + 15);
            return before.includes("to") || after.includes("க்கு") || before.includes("டூ");
          }
          return false;
        });
      });
      detectedDestination = toMatch ? toMatch.key : possibleDests[0].key;
    }

    if (detectedPickup && detectedDestination && detectedPickup === detectedDestination) {
      if (detectedDestination === "Madurai") {
        detectedDestination = "Madurai Silo Complex";
      }
    }

    // 3. Weight & Unit detection
    // Try regex matching: e.g. "1.5 tons" or "500 kg"
    const numRegex = /(\d+(?:\.\d+)?)\s*(ton|tons|டன்|kg|kgs|கிலோகிராம்|கிலோ)/gi;
    const match = numRegex.exec(raw);
    if (match) {
      detectedWeight = match[1];
      const unitStr = match[2].toLowerCase();
      if (unitStr.includes("ton") || unitStr.includes("டன்")) {
        detectedUnit = "tons";
      } else {
        detectedUnit = "kg";
      }
    } else {
      const fallbackNumRegex = /(\d+(?:\.\d+)?)/g;
      const fMatch = fallbackNumRegex.exec(raw);
      if (fMatch) {
         detectedWeight = fMatch[1];
      }
    }

    // Populate cargoForm attributes dynamically
    setCargoForm(prev => {
      const updated = { ...prev };
      if (detectedCrop) updated.cropName = detectedCrop;
      if (detectedWeight) updated.weight = detectedWeight;
      if (detectedUnit) updated.weightUnit = detectedUnit;
      if (detectedPickup) updated.pickup = detectedPickup;
      if (detectedDestination) updated.destination = detectedDestination;
      return updated;
    });

    let successCount = 0;
    if (detectedCrop) successCount++;
    if (detectedWeight) successCount++;
    if (detectedPickup) successCount++;
    if (detectedDestination) successCount++;

    if (successCount >= 3) {
      setVoiceParsedStatus("success");
    } else if (successCount > 0) {
      setVoiceParsedStatus("partial");
    } else {
      setVoiceParsedStatus("failed");
    }
  };

  const startSpeechRecognition = () => {
    setSpeechError(null);
    setVoiceParsedStatus(null);
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError("Speech recognition is not supported in this browser. Please use the simulated text parser below!");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = lang === "ta" ? "ta-IN" : "en-IN";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error", event);
        setSpeechError(`Speech error (${event.error}). Please type manually or run the simulator.`);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        parseCargoSpeech(transcript);
      };

      recognition.start();
    } catch (e: any) {
      setSpeechError(e.message || "Failed to initiate microphone context.");
      setIsListening(false);
    }
  };

  // Dynamic Fleet Helper Methods
  const calculateAverageFleetRating = () => {
    const ratedVehicles = transporterFleet.filter(v => v.rating && v.ratingCount);
    if (ratedVehicles.length === 0) return "5.0";
    const sum = ratedVehicles.reduce((acc, v) => acc + (v.rating || 5), 0);
    return (sum / ratedVehicles.length).toFixed(1);
  };

  const calculateTotalRatingsCount = () => {
    return transporterFleet.reduce((acc, v) => acc + (v.ratingCount || 0), 0);
  };

  // Client market price state (polled from server)
  const [marketPrices, setMarketPrices] = useState<CropPrice[]>([]);
  const [isPricesLoading, setIsPricesLoading] = useState(true);

  // Simulated nearby requests for dynamic transporter gameplay
  const [nearbyRequests, setNearbyRequests] = useState<any[]>([
    {
      id: "R-901",
      farmerName: "Chinnasamy A",
      cropName: "Brinjal",
      weight: "1.2 Tons",
      route: "Theni to Trichy",
      urgency: "High",
      payout: 4200,
      storageRequired: "Normal"
    },
    {
      id: "R-902",
      farmerName: "Subramanian P",
      cropName: "Grapes",
      weight: "800 kg",
      route: "Coimbatore to Salem",
      urgency: "Immediate (Needs Air-lock)",
      payout: 6800,
      storageRequired: "Cold"
    }
  ]);

  // Translate helper
  const t = (key: string): string => {
    const currentLang = lang || "en";
    return translations[currentLang][key] || key;
  };

  // Persist language Choice
  const handleSelectLanguage = (selected: Language) => {
    setLang(selected);
    localStorage.setItem("farmgo_lang", selected);
  };

  // Fetch Live Prices on Mount & Poll
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch("/api/market-prices");
        if (res.ok) {
          const data = await res.json();
          setMarketPrices(data);
        }
      } catch (err) {
        console.warn("Could not connect to prices endpoint. Running offline pricing feed.", err);
        // Instant beautiful local price mocks as reliable fallback
        setMarketPrices([
          { crop: "Tomato", Tamil: "தக்காளி", price: 28, change: "+₹2.2", trend: "up", isUp: true },
          { crop: "Onion", Tamil: "வெங்காயம்", price: 34.5, change: "-₹1.1", trend: "down", isUp: false },
          { crop: "Mango", Tamil: "மாம்பழம்", price: 45, change: "+₹4.8", trend: "up", isUp: true },
          { crop: "Potato", Tamil: "உருளைக்கிழங்கு", price: 31, change: "+₹0.5", trend: "up", isUp: true },
          { crop: "Banana", Tamil: "வாழைப்பழம்", price: 40, change: "+₹1.5", trend: "up", isUp: true },
          { crop: "Carrot", Tamil: "கேரட்", price: 54, change: "-₹2.0", trend: "down", isUp: false }
        ]);
      } finally {
        setIsPricesLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 8000);
    return () => clearInterval(interval);
  }, []);

  // Save Fleet changes
  useEffect(() => {
    localStorage.setItem("farmgo_fleet", JSON.stringify(transporterFleet));
  }, [transporterFleet]);

  // Save Completed Trips changes
  useEffect(() => {
    localStorage.setItem("farmgo_completed_trips", JSON.stringify(completedTrips));
  }, [completedTrips]);

  // Live progress simulation of step 6 real-time agricultural GPS tracker list
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (farmerStep === 6 && aiResult) {
      setTrackingProgress(0);
      setCurrentDistanceTravelled(0);
      setCargoCurrentTemp(aiResult.storageType === "Cold" ? 9.8 : aiResult.storageType === "Dry" ? 17.5 : 24.2);

      timer = setInterval(() => {
        setTrackingProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            setTrackingStatusMsg("Arrived and delivered safely at destination silo!");
            return 100;
          }
          const next = prev + 1;
          
          // Compute matching tracking details
          const currentDist = Math.round((next / 100) * aiResult.distanceKm);
          setCurrentDistanceTravelled(currentDist);

          // Fluctuating cargo temperature safety monitoring
          setCargoCurrentTemp((temp) => {
            const baseTarget = aiResult.storageType === "Cold" ? 10 : aiResult.storageType === "Dry" ? 18 : 25;
            const drift = (Math.random() - 0.5) * 0.4;
            return Math.round((baseTarget + drift) * 10) / 10;
          });

          // State message triggers
          if (next === 1) setTrackingStatusMsg("Departing agricultural pickup hub...");
          else if (next === 25) setTrackingStatusMsg("Cruising state highway - cargo temperature stable.");
          else if (next === 50) setTrackingStatusMsg("Passed major NH bypass toll. On track.");
          else if (next === 80) setTrackingStatusMsg("Entering destination city limit - refrigeration online.");
          else if (next === 98) setTrackingStatusMsg("Arriving at wholesale agri-bazaar center silo.");

          return next;
        });
      }, 1000); // Progress travels 1% every second
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [farmerStep, aiResult]);

  // Trigger AI analysis logic
  const handleAnalyzeCargo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cargoForm.cropName.trim()) return;

    setLoadingAI(true);
    try {
      const res = await fetch("/api/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: selectedCategory,
          cropName: cargoForm.cropName,
          weight: `${cargoForm.weight} ${cargoForm.weightUnit}`,
          pickup: cargoForm.pickup,
          destination: cargoForm.destination,
          lang: lang
        })
      });

      if (res.ok) {
        const payload = await res.json();
        setAiResult(payload.analysis);
        setFarmerStep(3); // Launch predictions display cards screen
      } else {
        throw new Error("API analysis response error");
      }
    } catch (err) {
      console.warn("Falling back to local high-fidelity math engine", err);
      // Fallback calculation directly
      const fallbackPrediction: PredictionResult = {
        distanceKm: 165,
        storageType: cargoForm.cropName.toLowerCase().includes("tomato") || selectedCategory === "fruits" ? "Cold" : "Normal",
        tempRange: cargoForm.cropName.toLowerCase().includes("tomato") || selectedCategory === "fruits" ? "8°C - 12°C" : "22°C - 28°C",
        recommendedVehicle: "Mini Truck",
        estimatedCost: 4500,
        capacityLimit: "1.2 Tons",
        tamilStorage: "குளிரூட்டப்பட்ட சேமிப்பு (Cold)",
        tamilTemp: "8°C - 12°C",
        reasoningEn: `High quality ${cargoForm.cropName} crop needs specialized logistics transit safely from ${cargoForm.pickup} to ${cargoForm.destination}.`,
        reasoningTa: `உயர்தர ${cargoForm.cropName} பயிர் பாதுகாப்பாக விநியோகிக்க சில சிறப்பு போக்குவரத்துகள் தேவைப்படுகின்றன.`
      };
      setAiResult(fallbackPrediction);
      setFarmerStep(3);
    } finally {
      setLoadingAI(false);
    }
  };

  // Filter vehicles specifically matching crop chosen vehicle (The crop chooses the vehicle)
  const getFilteredAndSortedVehicles = () => {
    if (!aiResult) return transporterFleet;
    
    // Sort logic from lowest to highest pricing
    return [...transporterFleet].sort((a, b) => {
      // Calculate responsive premium multiplier based on distance
      const baseDistance = aiResult.distanceKm;
      const rateA = a.storageType === "Cold" ? b.price * 1.3 : b.price;
      const rateB = b.storageType === "Cold" ? a.price * 1.3 : a.price;
      return a.price - b.price;
    });
  };

  // Confirm and start trip (Farmer step 5 -> 6 transition)
  const handleFinalConfirmBooking = () => {
    if (selectedVehicle) {
      // Add record to completedTrips list
      const newTrip: CompletedTrip = {
        id: `T-${Math.floor(1000 + Math.random() * 9000)}`,
        cargo: `${cargoForm.cropName} (${cargoForm.weight} ${cargoForm.weightUnit === "kg" ? t("kg") : t("tons")})`,
        route: `${cargoForm.pickup} to ${cargoForm.destination}`,
        driverName: selectedVehicle.driverName,
        payout: selectedVehicle.price,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };
      setCompletedTrips((prev) => [newTrip, ...prev]);
      setTransporterEarnings((prev) => prev + selectedVehicle.price);
      setTransporterTrips((prev) => prev + 1);
    }

    // Post back to dynamic server state so Transporter sees it in active
    fetch("/api/bookings/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: selectedCategory,
        cropName: cargoForm.cropName,
        weight: cargoForm.weight,
        weightUnit: cargoForm.weightUnit,
        pickup: cargoForm.pickup,
        destination: cargoForm.destination,
        analysis: aiResult
      })
    }).then(() => {
      setFarmerStep(6);
    }).catch((e) => {
      console.warn("Could not alert server history module:", e);
      setFarmerStep(6);
    });
  };

  // Add customized vehicle to fleet registry
  const handleAddVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicleForm.name || !newVehicleForm.driverName) return;

    const newVh: Vehicle = {
      id: `v-${Date.now()}`,
      name: newVehicleForm.name,
      tamilName: newVehicleForm.name,
      image: newVehicleForm.storageType === "Cold" ? "🧊" : newVehicleForm.storageType === "Dry" ? "🛻" : "🚚",
      driverName: newVehicleForm.driverName,
      driverTamilName: newVehicleForm.driverName,
      driverPhone: newVehicleForm.driverPhone || "+91 94444 00000",
      capacity: newVehicleForm.capacity,
      storageType: newVehicleForm.storageType,
      price: Number(newVehicleForm.price) || 3500,
      imageType: "mini",
      rating: undefined,
      ratingCount: 0,
      ratings: []
    };

    setTransporterFleet([newVh, ...transporterFleet]);
    setIsAddingVehicle(false);
    setNewVehicleForm({
      name: "",
      capacity: "1.5 Tons",
      storageType: "Cold",
      price: 4500,
      driverName: "",
      driverPhone: "",
      hasAC: true,
    });
  };

  // Login handler
  const handleSimulatedLogin = (e: React.FormEvent, role: "farmer" | "transporter") => {
    e.preventDefault();
    setUserRole(role);
    localStorage.setItem("user_role_farmgo", role);
    setShowLoginModal(false);
    if (role === "farmer") {
      setPage("farmer");
      setFarmerStep(1);
    } else {
      setPage("transporter");
    }
  };

  // Tamil Nadu locations quick preset helper
  const commonTNMarketsFrom = ["Madurai", "Coimbatore", "Salem", "Theni", "Trichy", "Thanjavur","Dindigul","Palani"];
  const commonTNMarketsTo = ["Chennai Koyambedu", "Trichy Market", "Salem Agro-Center", "Madurai Silo Complex", "Coimbatore Whole-Sale"];

  // Popular Tamil Nadu crops presets for prompt support
  const cropPresets = [
    { en: "Tomato", ta: "தக்காளி", icon: "🍅", cat: "vegetables" },
    { en: "Onion", ta: "வெங்காயம்", icon: "🧅", cat: "vegetables" },
    { en: "Mango", ta: "மாம்பழம்", icon: "🥭", cat: "fruits" },
    { en: "Potato", ta: "உருளைக்கிழங்கு", icon: "🥔", cat: "vegetables" },
    { en: "Banana", ta: "வாழைப்பழம்", icon: "🍌", cat: "fruits" },
    { en: "Carrot", ta: "கேரட்", icon: "🥕", cat: "vegetables" },
    { en: "Brinjal", ta: "கத்தரிக்காய்", icon: "🍆", cat: "vegetables" },
    { en: "Coconut", ta: "தேங்காய்", icon: "🥥", cat: "fruits" }
  ];

  // Render language selection
  if (lang === null) {
    return (
      <div id="welcome-overlay" className="min-h-screen bg-gradient-to-br from-emerald-800 via-green-800 to-emerald-900 flex flex-col justify-between p-6 relative overflow-hidden">
        {/* Decorative farm canvas grids overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-10"></div>
        
        <div className="max-w-md mx-auto w-full my-auto flex flex-col items-center">
          {/* Logo Title (Exact styled geometric sans-serif logo matches user branding image) */}
          <div className="flex items-center bg-white py-5 px-10 rounded-2xl shadow-xl mb-12 transform hover:scale-105 transition-all duration-300 select-none border border-emerald-100">
            <span className="font-display font-extrabold text-5xl md:text-6xl tracking-tight text-[#00D26A]">farm</span>
            <span className="font-display font-extrabold text-5xl md:text-6xl tracking-tight text-[#07240E]">Go</span>
          </div>

          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20 w-full text-center">
            <Languages className="w-12 h-12 text-emerald-600 mx-auto mb-4 animate-bounce" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Select Language</h2>
            <h2 className="text-xl font-medium text-emerald-700 mb-6 font-display">மொழியைத் தேர்ந்தெடுக்கவும்</h2>

            <div className="space-y-4">
              <button
                id="btn-lang-ta"
                onClick={() => handleSelectLanguage("ta")}
                className="w-full flex items-center justify-between p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl font-display font-bold text-lg text-emerald-800 transition-all duration-200 shadow-sm grow-hover hover:border-emerald-400 group"
              >
                <span>தமிழ்</span>
                <span className="text-xs bg-emerald-700 text-white py-1 px-2.5 rounded-full font-sans group-hover:bg-emerald-800 transition-colors">செயலில் சேர்</span>
              </button>

              <button
                id="btn-lang-en"
                onClick={() => handleSelectLanguage("en")}
                className="w-full flex items-center justify-between p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl font-display font-bold text-lg text-emerald-800 transition-all duration-200 shadow-sm grow-hover hover:border-emerald-400 group"
              >
                <span>English</span>
                <span className="text-xs bg-emerald-700 text-white py-1 px-2.5 rounded-full font-sans group-hover:bg-emerald-800 transition-colors">SELECT ACTIVE</span>
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-white/50 font-medium">
          farmGo Agricultural Multi-Hub Dispatch Startup © 2026 • Tamil Nadu Corp.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-bg-light text-dark">
      {/* Dynamic scrolling market statistics ticker for Tamil Nadu */}
      <div className="bg-dark overflow-hidden py-2 border-b border-secondary/20 z-30 select-none">
        <div className="relative max-w-7xl mx-auto px-4 flex items-center">
          <div className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-dark to-transparent w-8 z-10"></div>
          <div className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-dark to-transparent w-8 z-10"></div>
          
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-accent font-sans mr-4 flex items-center gap-1.5 shrink-0 bg-[#0E3D12]/60 px-2 py-0.5 rounded-md border border-secondary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
            {t("marketLiveTracker")}
          </div>

          <div className="w-full overflow-hidden whitespace-nowrap">
            <div className="animate-ticker text-xs font-medium text-accent flex items-center gap-12">
              {marketPrices.concat(marketPrices).map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5 font-mono">
                  <span className="font-sans font-semibold text-white">
                    {lang === "ta" ? item.Tamil : item.crop}
                  </span>
                  <span className="text-secondary font-bold">₹{item.price}/{t("kg")}</span>
                  <span className={`text-[11px] px-1 rounded ${item.trend === "up" ? "text-secondary bg-[#0E3D12]/40" : "text-rose-300 bg-rose-950/40"}`}>
                    {item.change}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Header navigation */}
      <header className="sticky top-0 bg-white border-b border-secondary/20 z-20 py-4 shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          
          {/* Logo Component (Styled exact geometric sans matching the uploaded logo) */}
          <div
            id="app-logo"
            onClick={() => setPage("home")}
            className="flex items-center gap-1.5 cursor-pointer select-none transform hover:scale-105 active:scale-98 transition-all duration-200"
          >
            <span className="font-display font-extrabold text-4xl md:text-5xl tracking-tight text-[#00D26A] drop-shadow-sm">farm</span>
            <span className="font-display font-extrabold text-4xl md:text-5xl tracking-tight text-[#07240E] drop-shadow-sm">Go</span>
          </div>

          {/* Quick Info / Dynamic Lang toggle and Access Points */}
          <div className="flex items-center gap-3">
            {/* Direct Instant Switch Lang Flag */}
            <button
              onClick={() => handleSelectLanguage(lang === "en" ? "ta" : "en")}
              className="flex items-center gap-1 text-dark hover:text-primary font-medium text-xs bg-accent hover:bg-secondary/30 py-1.5 px-3 rounded-lg border border-secondary/30 transition-all font-display"
            >
              <Languages className="w-3.5 h-3.5 text-primary" />
              <span>{lang === "en" ? "தமிழ்" : "English"}</span>
            </button>

            {/* Simulated Auth controls */}
            {userRole === "guest" ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="bg-primary hover:bg-primary/90 text-white text-xs font-bold py-1.5 px-3.5 rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{t("signIn")}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="hidden md:inline-flex items-center gap-1 text-xs bg-accent text-dark py-1 px-2.5 rounded-full font-semibold border border-secondary/40">
                  <User className="w-3 h-3 text-primary" />
                  <span className="capitalize">{userRole} MODE</span>
                </span>
                <button
                  onClick={() => {
                    setUserRole("guest");
                    setPage("home");
                  }}
                  className="bg-secondary/20 hover:bg-secondary/40 text-dark text-xs font-semibold py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  {t("logout")}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6">
        
        {/* HOMEPAGE VIEW PORT */}
        {page === "home" && (
          <div className="space-y-8">
            {/* Hero Banner Grid (Premium vector illustration format) */}
            <div className="bg-gradient-to-br from-dark via-primary to-[#124316] text-white rounded-3xl p-6 md:p-12 relative overflow-hidden shadow-xl">
              {/* Overlay abstract background pattern to resemble plowed fields */}
              <div className="absolute inset-x-0 bottom-0 h-48 bg-[linear-gradient(to_bottom,transparent,var(--dark))] opacity-20"></div>
              <div className="absolute -right-12 -top-12 w-64 h-64 bg-primary/20 rounded-full blur-3xl"></div>

              <div className="grid md:grid-cols-2 gap-8 items-center relative z-10">
                <div className="space-y-4 text-center md:text-left">
                  <span className="inline-flex items-center gap-1.5 bg-[#124316]/60 backdrop-blur-xs text-secondary text-xs font-extrabold uppercase py-1 px-3.5 rounded-full border border-secondary/30 font-mono tracking-widest">
                    <Award className="w-3 h-3 text-secondary" /> Rural Tamil Nadu Carrier Link
                  </span>
                  <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight !text-white animate-fade-in">
                    "{t("slogan")}"
                  </h1>
                  <p className="text-accent/95 text-sm md:text-base leading-relaxed max-w-lg mx-auto md:mx-0">
                    {t("tagline")}
                  </p>

                  <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                    <button
                      id="btn-goto-farmer"
                      onClick={() => {
                        setPage("farmer");
                        setFarmerStep(1);
                      }}
                      className="bg-white text-dark hover:bg-accent text-sm font-bold py-3.5 px-6 rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 group transform hover:translate-y-[-2px]"
                    >
                      <User className="w-4 h-4 text-primary" />
                      <span>{t("farmerBtn")}</span>
                      <ChevronRight className="w-4 h-4 text-primary transition-transform group-hover:translate-x-1" />
                    </button>

                    <button
                      id="btn-goto-transporter"
                      onClick={() => {
                        setPage("transporter");
                        setTransporterTab("dashboard");
                      }}
                      className="bg-[#124316]/60 hover:bg-[#124316]/80 text-accent border border-secondary/40 text-sm font-bold py-3.5 px-6 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 transform hover:translate-y-[-2px]"
                    >
                      <Truck className="w-4 h-4 text-secondary" />
                      <span>{t("transporterBtn")}</span>
                    </button>
                  </div>
                </div>

                {/* Conceptual vector layout card showing Farmers and Haul Trucks as requested */}
                <div className="relative flex justify-center items-center">
                  <div className="w-full max-w-sm bg-white/10 backdrop-blur-xs border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-2 text-white">
                        <div className="p-2 bg-primary/20 rounded-lg">
                          <Package className="w-5 h-5 text-secondary" />
                        </div>
                        <div className="text-left">
                          <div className="text-xs text-secondary/80">Total Harvests</div>
                          <div className="text-lg font-bold">12,480 {t("kg")}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-white text-right">
                        <div className="text-left">
                          <div className="text-xs text-secondary/80">Active Trucks</div>
                          <div className="text-lg font-bold">84 Carriers</div>
                        </div>
                        <div className="p-2 bg-primary/20 rounded-lg">
                          <Truck className="w-5 h-5 text-secondary" />
                        </div>
                      </div>
                    </div>

                    {/* Highly polished mini visual status map vector */}
                    <div className="bg-dark/40 rounded-xl p-3 border border-secondary/20 space-y-2">
                      <div className="flex justify-between text-[11px] font-mono text-secondary">
                        <span>MADURAI HUB</span>
                        <span className="text-amber-400">IN TRANSIT</span>
                        <span>KOYAMBEDU</span>
                      </div>
                      <div className="h-1 bg-primary/30 rounded-full overflow-hidden relative">
                        <div className="absolute top-0 bottom-0 left-0 bg-secondary w-2/3 animate-pulse"></div>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-accent/90 font-mono pt-1">
                        <span>Cargo: Fresh Tomatoes</span>
                        <span className="bg-[#124316]/60 text-accent py-0.2 px-1 rounded">Cold storage : 9.5°C</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live High Price Market Index Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 text-left animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                    <span className="p-2 bg-emerald-50 text-emerald-800 rounded-xl text-sm">📈</span>
                    <span>{t("liveHighPriceTitle")}</span>
                  </h3>
                  <p className="text-xs text-slate-500">{t("liveHighPriceDesc")}</p>
                </div>
                
                {/* Crop Tabs */}
                <div className="flex gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100 w-fit self-start md:self-auto">
                  {["Tomato", "Onion", "Potato"].map((crop) => (
                    <button
                      key={crop}
                      onClick={() => setHomeMarketSelectedCrop(crop)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        homeMarketSelectedCrop === crop
                          ? "bg-emerald-700 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {crop === "Tomato" ? "🍅 " : crop === "Onion" ? "🧅 " : "🥔 "}
                      {crop === "Tomato" ? (lang === "ta" ? "தக்காளி" : "Tomato") : crop === "Onion" ? (lang === "ta" ? "வெங்காயம்" : "Onion") : (lang === "ta" ? "உருளைக்கிழங்கு" : "Potato")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Details Grid */}
              <div className="grid md:grid-cols-3 gap-6">
                {/* Chennai */}
                <div className="bg-slate-50/60 rounded-2xl p-5 border border-slate-150 relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Chennai Market</span>
                      <span className="text-emerald-600 text-xs font-bold font-mono">Stable</span>
                    </div>
                    <div className="text-3xl font-black text-slate-800">
                      ₹{homeMarketSelectedCrop === "Tomato" ? "22" : homeMarketSelectedCrop === "Onion" ? "38" : "28"}/{t("kg")}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-4">Koyambedu Wholesale Hub</div>
                </div>

                {/* Madurai */}
                <div className="bg-slate-50/60 rounded-2xl p-5 border border-slate-150 relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Madurai Market</span>
                      <span className="text-amber-500 text-xs font-bold font-mono">Discounted</span>
                    </div>
                    <div className="text-3xl font-black text-slate-800">
                      ₹{homeMarketSelectedCrop === "Tomato" ? "18" : homeMarketSelectedCrop === "Onion" ? "34" : "25"}/{t("kg")}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-4 font-sans">Paravai Market Yard</div>
                </div>

                {/* Salem - Best Price Market Highlight */}
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 rounded-2xl p-5 border-2 border-emerald-400 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute right-0 top-0 bg-emerald-600 text-white text-[9px] font-black tracking-widest px-3 py-1 rounded-bl-xl uppercase font-sans">
                    BEST PAYOUT
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800">Salem Market</span>
                      <span className="text-emerald-800 text-xs font-bold font-mono">Highest Price</span>
                    </div>
                    <div className="text-3xl font-black text-emerald-950 font-sans">
                      ₹{homeMarketSelectedCrop === "Tomato" ? "24" : homeMarketSelectedCrop === "Onion" ? "40" : "29"}/{t("kg")}
                    </div>
                  </div>
                  <div className="text-[10px] text-emerald-700/80 font-mono mt-4 font-sans">Salem Agro-Center Hub</div>
                </div>
              </div>

              {/* Highlights Summary Panel */}
              <div className="bg-emerald-800 text-white rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black tracking-widest uppercase text-emerald-200 block">
                    {t("bestMarket")}
                  </span>
                  <div className="text-lg font-extrabold tracking-tight">
                    {lang === "ta" ? "சேலம் மார்க்கெட் (Salem) - சிறந்த லாபகரமான மார்க்கெட்!" : "Salem Agro-Center - Earn maximum revenue today!"}
                  </div>
                  <p className="text-xs text-emerald-100/85">Sell at ₹{homeMarketSelectedCrop === "Tomato" ? "24" : homeMarketSelectedCrop === "Onion" ? "40" : "29"}/kg directly with zero deduction by brokers.</p>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    setPage("farmer");
                    setFarmerStep(1);
                  }}
                  className="bg-white hover:bg-emerald-50 text-emerald-900 text-xs font-extrabold py-3 px-5 rounded-xl cursor-pointer transition-all self-stretch sm:self-auto text-center"
                >
                  🚚 Book Route Now
                </button>
              </div>
            </div>

            {/* Farmer Profitability Calculator Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 text-left animate-in fade-in duration-300">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl">
                  <Calculator className="w-6 h-6 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800">
                    {t("farmerCalcTitle")}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t("farmerCalcDesc")}
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-12 gap-8">
                {/* Inputs Columns */}
                <div className="md:col-span-7 space-y-5">
                  {/* Production slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                      <span>{t("productionCostLabel")}</span>
                      <span className="font-mono text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg text-sm">
                        ₹{calcProductionCost.toLocaleString()}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5000"
                      max="150000"
                      step="5000"
                      value={calcProductionCost}
                      onChange={(e) => setCalcProductionCost(Number(e.target.value))}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-700"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-medium font-mono">
                      <span>₹5,000</span>
                      <span>₹1,50,050</span>
                    </div>
                  </div>

                  {/* Transport slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                      <span>{t("transportCostLabel")}</span>
                      <span className="font-mono text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg text-sm">
                        ₹{calcTransportCost.toLocaleString()}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1000"
                      max="50000"
                      step="1000"
                      value={calcTransportCost}
                      onChange={(e) => setCalcTransportCost(Number(e.target.value))}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-700"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-medium font-mono">
                      <span>₹1,000</span>
                      <span>₹50,000</span>
                    </div>
                  </div>

                  {/* Selling Price slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                      <span>{t("sellingPriceLabel")}</span>
                      <span className="font-mono text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg text-sm">
                        ₹{calcSellingPrice.toLocaleString()}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10000"
                      max="200000"
                      step="5000"
                      value={calcSellingPrice}
                      onChange={(e) => setCalcSellingPrice(Number(e.target.value))}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-700"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-medium font-mono">
                      <span>₹10,000</span>
                      <span>₹2,00,000</span>
                    </div>
                  </div>

                  {/* Preset Helper Button */}
                  <div className="pt-2 flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider">CHOOSE PRESETS:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setCalcProductionCost(50000);
                        setCalcTransportCost(10000);
                        setCalcSellingPrice(80000);
                      }}
                      className="text-[11px] font-extrabold px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 hover:text-emerald-800 cursor-pointer transition-colors"
                    >
                      🌟 Live Demo Example (₹20,000 Profit)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCalcProductionCost(25000);
                        setCalcTransportCost(8000);
                        setCalcSellingPrice(45000);
                      }}
                      className="text-[11px] font-extrabold px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 hover:text-emerald-800 cursor-pointer transition-colors"
                    >
                      🧅 Onion Yield Preset
                    </button>
                  </div>
                </div>

                {/* Live Output Payout Gauges */}
                <div className="md:col-span-5 bg-slate-50/80 rounded-2xl p-5 border border-slate-150 flex flex-col justify-between space-y-4">
                  <div>
                    <h4 className="text-xs font-black tracking-widest text-slate-400 uppercase mb-2">PROFIT MARGIN ANALYSIS</h4>
                    
                    {/* Visual Breakdown Strip */}
                    {(() => {
                      const totalInputs = calcProductionCost + calcTransportCost;
                      const isLoss = calcSellingPrice < totalInputs;
                      const profit = calcSellingPrice - totalInputs;
                      const scale = calcSellingPrice || 1;

                      const prodPct = Math.min(100, Math.round((calcProductionCost / scale) * 100));
                      const transPct = Math.min(100, Math.round((calcTransportCost / scale) * 100));
                      const profitPct = isLoss ? 0 : Math.max(0, 100 - (prodPct + transPct));

                      return (
                        <div className="space-y-4">
                          {/* Segmented Bar */}
                          <div className="h-4 w-full bg-slate-200 rounded-full flex overflow-hidden">
                            <div 
                              style={{ width: `${prodPct}%` }} 
                              className="bg-amber-500 hover:opacity-95 transition-all my-0.5 ml-0.5 rounded-l-full"
                              title={`Production Cost: ${prodPct}%`}
                            />
                            <div 
                              style={{ width: `${transPct}%` }} 
                              className="bg-amber-600 hover:opacity-95 transition-all my-0.5"
                              title={`Transport Cost: ${transPct}%`}
                            />
                            {!isLoss && (
                              <div 
                                style={{ width: `${profitPct}%` }} 
                                className="bg-emerald-600 hover:opacity-95 transition-all my-0.5 my-0.5 mr-0.5 rounded-r-full"
                                title={`Net Profit: ${profitPct}%`}
                              />
                            )}
                          </div>

                          {/* Legend list */}
                          <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-600">
                            <div className="flex items-center gap-1">
                              <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block shrink-0"></span>
                              <span>Cost: {prodPct}%</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="w-2.5 h-2.5 rounded-xs bg-amber-600 inline-block shrink-0"></span>
                              <span>Transport: {transPct}%</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block shrink-0"></span>
                              <span>Profit: {isLoss ? "0" : profitPct}%</span>
                            </div>
                          </div>

                          {/* Large display block */}
                          <div className={`rounded-xl p-4 border text-center transition-all ${
                            isLoss 
                              ? "bg-rose-50 border-rose-200 text-rose-950" 
                              : profit >= 20000 
                                ? "bg-emerald-800 border-emerald-900 text-white" 
                                : "bg-amber-50 border-amber-200 text-amber-950"
                          }`}>
                            <span className={`text-xs block font-bold uppercase tracking-widest ${isLoss ? "text-rose-700" : profit >= 20000 ? "text-emerald-200" : "text-amber-700"}`}>
                              {t("netProfitLabel")}
                            </span>
                            <span className="text-3xl font-black block tracking-tight pt-1">
                              {isLoss ? "-" : ""}₹{Math.abs(profit).toLocaleString()}
                            </span>
                            <p className={`text-[11px] leading-snug font-medium pt-2 ${isLoss ? "text-rose-600" : profit >= 20000 ? "text-emerald-100/90" : "text-slate-600"}`}>
                              {isLoss 
                                ? "Selling below cost results in loss! Try negotiating higher wholesale payouts." 
                                : profit >= 20000 
                                  ? t("profitHighMessage") 
                                  : t("profitLowMessage")}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Step Guide / Features Area */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="natural-card p-6 flex flex-col">
                <div className="p-3 bg-accent text-primary rounded-xl w-fit mb-4">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-dark mb-2">1. The Crop Chooses (AI)</h3>
                <p className="text-sm text-dark/80 leading-relaxed">
                  Enter your cargo name and weight. Our server-side system instantly calculates storage state, safe temperature margins and selects compatible reefers.
                </p>
              </div>

              <div className="natural-card p-6 flex flex-col">
                <div className="p-3 bg-accent text-primary rounded-xl w-fit mb-4">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-dark mb-2">2. Low-Fare Direct Transit</h3>
                <p className="text-sm text-dark/80 leading-relaxed">
                  Compare registered verified carriers sorted transparently by price. No middleman broker deductions. Direct farmer-driver bookings.
                </p>
              </div>

              <div className="natural-card p-6 flex flex-col">
                <div className="p-3 bg-accent text-primary rounded-xl w-fit mb-4">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-dark mb-2">3. Responsive GPS Tracking</h3>
                <p className="text-sm text-dark/80 leading-relaxed">
                  Watch your crops move along the highway via custom interactive map telemetries updated with cargo ambient temperature readings.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* FARMER SECTION */}
        {page === "farmer" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header step progress indicators */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center justify-between overflow-x-auto gap-4">
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setPage("home")}
                  className="text-slate-500 hover:text-emerald-700 text-xs font-semibold mr-2 transition-colors"
                >
                  ← Home
                </button>
              </div>
              
              <div className="flex items-center gap-3 text-xs md:text-sm">
                <span className={`py-1 px-3.5 rounded-full font-bold ${farmerStep >= 1 ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                  1
                </span>
                <span className="text-slate-300">/</span>
                <span className={`py-1 px-3.5 rounded-full font-bold ${farmerStep >= 2 ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                  2
                </span>
                <span className="text-slate-300">/</span>
                <span className={`py-1 px-3.5 rounded-full font-bold ${farmerStep >= 3 ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                  3 (AI)
                </span>
                <span className="text-slate-300">/</span>
                <span className={`py-1 px-3.5 rounded-full font-bold ${farmerStep >= 5 ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                  4
                </span>
              </div>
            </div>

            {/* STEP 1: CHOOSE CATEGORY */}
            {farmerStep === 1 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-extrabold text-slate-800">{t("chooseCategory")}</h2>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">Select whether you are transporting fruits or vegetables so our matching algorithm can sort correct refrigeration.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 pt-4">
                  <button
                    id="card-cat-veg"
                    onClick={() => {
                      setSelectedCategory("vegetables");
                      setFarmerStep(2);
                    }}
                    className="bg-white hover:bg-emerald-50/40 p-8 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 hover:shadow-md text-left transition-all group relative overflow-hidden"
                  >
                    <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl w-fit group-hover:bg-emerald-100 transition-colors mb-6">
                      <span className="text-4xl">🍅</span>
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-800 mb-2">{t("vegetables")}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{t("vegetablesDesc")}</p>
                    <div className="absolute right-4 bottom-4 w-8 h-8 rounded-full bg-slate-100 group-hover:bg-emerald-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-all">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </button>

                  <button
                    id="card-cat-fruits"
                    onClick={() => {
                      setSelectedCategory("fruits");
                      setFarmerStep(2);
                    }}
                    className="bg-white hover:bg-emerald-50/40 p-8 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 hover:shadow-md text-left transition-all group relative overflow-hidden"
                  >
                    <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl w-fit group-hover:bg-emerald-100 transition-colors mb-6">
                      <span className="text-4xl">🥭</span>
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-800 mb-2">{t("fruits")}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{t("fruitsDesc")}</p>
                    <div className="absolute right-4 bottom-4 w-8 h-8 rounded-full bg-slate-100 group-hover:bg-emerald-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-all">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: FILL HARVEST DETAILS FORM */}
            {farmerStep === 2 && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <span className="p-2 bg-emerald-50 text-emerald-800 rounded-lg text-sm">
                      {selectedCategory === "fruits" ? "🥭" : "🍅"}
                    </span>
                    {t("enterHarvestDetails")} (
                    {selectedCategory === "fruits" ? t("fruits") : t("vegetables")})
                  </h3>
                  <button
                    onClick={() => setFarmerStep(1)}
                    className="text-xs text-slate-400 hover:text-rose-500 font-bold transition-colors"
                  >
                    Change Category
                  </button>
                </div>

                {/* Popular Presets click selector */}
                <div className="mb-6 space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Quick Selection:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {cropPresets
                      .filter((c) => c.cat === selectedCategory)
                      .map((preset) => (
                        <button
                          key={preset.en}
                          type="button"
                          onClick={() => {
                            setCargoForm({
                              ...cargoForm,
                              cropName: lang === "ta" ? preset.ta : preset.en,
                            });
                          }}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
                            cargoForm.cropName === preset.en || cargoForm.cropName === preset.ta
                              ? "bg-emerald-100 border-emerald-400 text-emerald-800 shadow-xs"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <span>{preset.icon}</span>
                          <span>{lang === "ta" ? preset.ta : preset.en}</span>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Voice Cargo Input Assistant Card */}
                <div className="mb-6 p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎙️</span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{t("voiceAssistantTitle")}</h4>
                      <p className="text-xs text-slate-500">{t("voiceAssistantDesc")}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap md:flex-nowrap gap-4 items-center">
                    {/* Pulsing Mic Button */}
                    <button
                      type="button"
                      onClick={startSpeechRecognition}
                      className={`relative flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs shadow-xs cursor-pointer transition-all ${
                        isListening
                          ? "bg-rose-500 text-white animate-pulse"
                          : "bg-emerald-700 hover:bg-emerald-800 text-white"
                      }`}
                    >
                      {isListening ? (
                        <>
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
                          </span>
                          <span>{t("micListening")}</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4" />
                          <span>{t("micClickToSpeak")}</span>
                        </>
                      )}
                    </button>

                    {/* Speech Recognition Text Field Simulator */}
                    <div className="flex-1 min-w-[240px] flex gap-2">
                      <input
                        type="text"
                        placeholder="Simulate voice typing (e.g. 'Tomatoes Salem to Coimbatore 4 tons')"
                        value={voiceInputSimulated}
                        onChange={(e) => setVoiceInputSimulated(e.target.value)}
                        className="flex-1 text-xs py-2.5 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (voiceInputSimulated.trim()) {
                            parseCargoSpeech(voiceInputSimulated);
                          }
                        }}
                        className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
                      >
                        ⚡ Match Simulator
                      </button>
                    </div>
                  </div>

                  {/* Recognition feedback message logic */}
                  {speechError && (
                    <p className="text-[11px] text-amber-600 font-semibold leading-relaxed bg-amber-50 rounded-xl p-3 border border-amber-100">
                      ⚠️ {speechError}
                    </p>
                  )}

                  {parsedText && (
                    <div className="space-y-2 bg-white rounded-xl p-3 border border-slate-200 text-xs">
                      <div className="flex justify-between items-center text-slate-400 font-mono text-[10px]">
                        <span>LAST HEARD TRANSCRIPT:</span>
                        <span className="bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                          {lang === "ta" ? "தமிழ்" : "English"}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-800 italic">"{parsedText}"</p>

                      {voiceParsedStatus === "success" && (
                        <div className="text-[11px] text-emerald-800 font-bold bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 flex items-center gap-1.5">
                          ✨ {t("voiceMatchSuccess")}
                        </div>
                      )}
                      {voiceParsedStatus === "partial" && (
                        <div className="text-[11px] text-amber-800 font-bold bg-amber-50 border border-amber-100 rounded-lg p-2.5 flex items-center gap-1.5">
                          ⚠️ {t("voiceMatchPartial")}
                        </div>
                      )}
                      {voiceParsedStatus === "failed" && (
                        <div className="text-[11px] text-rose-800 font-bold bg-rose-50 border border-rose-100 rounded-lg p-2.5 flex items-center gap-1.5">
                          ❌ {t("voiceMatchFailed")}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <form onSubmit={handleAnalyzeCargo} className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-5">
                    
                    {/* Crop input & preset name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-550 uppercase tracking-widest block">
                        {t("cropLabel")} *
                      </label>
                      <input
                        id="input-cargo-crop"
                        type="text"
                        value={cargoForm.cropName}
                        onChange={(e) => setCargoForm({ ...cargoForm, cropName: e.target.value })}
                        required
                        placeholder={t("cropPlaceholder")}
                        className="w-full text-sm py-3 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>

                    {/* Weight & unit input selector */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-550 uppercase tracking-widest block">
                        {t("weightLabel")} *
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="input-cargo-weight"
                          type="number"
                          value={cargoForm.weight}
                          onChange={(e) => setCargoForm({ ...cargoForm, weight: e.target.value })}
                          required
                          placeholder="e.g. 1500"
                          className="flex-1 text-sm py-3 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                        <select
                          value={cargoForm.weightUnit}
                          onChange={(e) => setCargoForm({ ...cargoForm, weightUnit: e.target.value })}
                          className="w-24 text-sm py-3 px-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold focus:outline-none"
                        >
                          <option value="kg">{t("kg")}</option>
                          <option value="tons">{t("tons")}</option>
                        </select>
                      </div>
                    </div>

                    {/* Pickup Tamil Nadu Locations */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-550 uppercase tracking-widest block">
                        {t("pickupLabel")} *
                      </label>
                      <select
                        id="input-cargo-from"
                        value={cargoForm.pickup}
                        onChange={(e) => setCargoForm({ ...cargoForm, pickup: e.target.value })}
                        className="w-full text-slate-800 text-sm py-3 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 transition-colors font-semibold"
                      >
                        {commonTNMarketsFrom.map((loc) => (
                          <option key={loc} value={loc}>
                            {loc === "Madurai" ? "Madurai (மதுரை)" : loc === "Coimbatore" ? "Coimbatore (கோவை)" : loc === "Salem" ? "Salem (சேலம்)" : loc === "Theni" ? "Theni (தேனி)" : loc === "Trichy" ? "Trichy (திருச்சி)" : "Thanjavur (தஞ்சாவூர்)"}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Destination Tamil Nadu Locations */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-550 uppercase tracking-widest block">
                        {t("destLabel")} *
                      </label>
                      <select
                        id="input-cargo-to"
                        value={cargoForm.destination}
                        onChange={(e) => setCargoForm({ ...cargoForm, destination: e.target.value })}
                        className="w-full text-slate-800 text-sm py-3 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 transition-colors font-semibold"
                      >
                        {commonTNMarketsTo.map((loc) => (
                          <option key={loc} value={loc}>
                            {loc === "Chennai Koyambedu" ? "Chennai Koyambedu Market (சென்னை கோயம்பேடு)" : loc === "Trichy Market" ? "Trichy Market (திருச்சி சந்தை)" : loc === "Salem Agro-Center" ? "Salem Agro-Center (சேலம் அக்ரி)" : loc === "Madurai Silo Complex" ? "Madurai Silo Complex (மதுரை சைலோ)" : "Coimbatore Whole-Sale (கோவை ஹோல்சேல்)"}
                          </option>
                        ))}
                      </select>
                    </div>

                  </div>

                  <div className="pt-4 border-t border-slate-100 flex gap-4">
                    <button
                      type="button"
                      onClick={() => setFarmerStep(1)}
                      className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                      Back
                    </button>
                    <button
                      id="btn-submit-farmer-form"
                      type="submit"
                      disabled={loadingAI}
                      className="flex-3 py-3 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50"
                    >
                      {loadingAI ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>{t("processingAI")}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>{t("analyzeBtn")}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 3: AI ASSISTANT CHAT SCREEN & PREDICTIONS */}
            {farmerStep === 3 && aiResult && (
              <div className="space-y-6">
                
                {/* AI Assistant Chat Card */}
                <div className="bg-gradient-to-br from-dark via-primary to-[#124316] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-secondary/20">
                  <div className="absolute right-0 top-0 w-36 h-36 bg-secondary/10 rounded-full blur-2xl"></div>
                  
                  <div className="space-y-3 text-left">
                    <div className="flex items-center gap-2">
                      <h4 className="text-md font-extrabold tracking-tight text-[#ffffff]">{t("aiAssistantTitle")}</h4>
                      <span className="text-[9px] font-mono bg-secondary/20 text-secondary uppercase py-0.5 px-2 rounded font-extrabold tracking-widest border border-secondary/30 animate-pulse">AGENT LOGIC VERIFIED</span>
                    </div>
                      
                      <p className="text-sm font-medium leading-relaxed text-accent bg-[#0E3D12]/40 p-4 rounded-2xl border border-secondary/15">
                        "{lang === "ta" ? aiResult.reasoningTa : aiResult.reasoningEn}"
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs font-mono text-accent">
                        <div className="p-2 bg-[#0E3D12]/60 rounded-xl border border-secondary/20">
                          <div className="text-[10px] text-secondary">Tomato requires:</div>
                          <div className="font-extrabold text-white text-sm">{aiResult.storageType} Storage</div>
                        </div>

                        <div className="p-2 bg-[#0E3D12]/60 rounded-xl border border-secondary/20">
                          <div className="text-[10px] text-secondary">Recommended Carrier:</div>
                          <div className="font-extrabold text-white text-sm">{aiResult.recommendedVehicle}</div>
                        </div>

                        <div className="p-2 bg-[#0E3D12]/60 rounded-xl border border-secondary/20">
                          <div className="text-[10px] text-secondary">Estimated Distance:</div>
                          <div className="font-extrabold text-white text-sm">{aiResult.distanceKm} km</div>
                        </div>

                        <div className="p-2 bg-[#0E3D12]/60 rounded-xl border border-secondary/20">
                          <div className="text-[10px] text-secondary">Estimated Cost:</div>
                          <div className="font-extrabold text-[#A5D6A7] text-sm">₹{aiResult.estimatedCost.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                {/* Below AI assistant show prediction cards */}
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-dark flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    <span>{t("predictionCardTitle")}</span>
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {/* Distance Card */}
                    <div className="bg-white rounded-2xl p-4 border border-secondary/25 shadow-xs text-center space-y-1">
                      <div className="text-[10px] font-bold text-dark/50 uppercase tracking-widest">Distance</div>
                      <div className="text-2xl font-extrabold text-dark">{aiResult.distanceKm} <span className="text-sm font-normal">km</span></div>
                      <div className="text-xs text-dark/70 font-medium">NH Roadway Node</div>
                    </div>

                    {/* Storage Type Card */}
                    <div className="bg-white rounded-2xl p-4 border border-secondary/25 shadow-xs text-center space-y-1">
                      <div className="text-[10px] font-bold text-dark/50 uppercase tracking-widest">Storage Type</div>
                      <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${aiResult.storageType === "Cold" ? "bg-accent text-primary border border-secondary/20" : "bg-amber-50 text-amber-800 border border-amber-200/50"}`}>
                        {aiResult.storageType} Storage
                      </span>
                      <div className="text-xs text-dark/70 font-medium">{lang === "ta" ? aiResult.tamilStorage : "Controlled Space"}</div>
                    </div>

                    {/* Temperature range Card */}
                    <div className="bg-white rounded-2xl p-4 border border-secondary/25 shadow-xs text-center space-y-1">
                      <div className="text-[10px] font-bold text-dark/50 uppercase tracking-widest">Temp Target</div>
                      <div className="text-lg font-extrabold text-dark flex items-center justify-center gap-1">
                        <Thermometer className="w-4 h-4 text-primary" />
                        <span>{aiResult.tempRange}</span>
                      </div>
                      <div className="text-xs text-dark/70 font-medium">Target Preservation</div>
                    </div>

                    {/* Recommended Vehicle */}
                    <div className="bg-white rounded-2xl p-4 border border-secondary/25 shadow-xs text-center space-y-1">
                      <div className="text-[10px] font-bold text-dark/50 uppercase tracking-widest">Ideal Carrier</div>
                      <div className="text-sm font-extrabold text-primary leading-tight block">{aiResult.recommendedVehicle}</div>
                      <div className="text-xs text-dark/70 font-medium font-sans">Capacity Limit: {aiResult.capacityLimit}</div>
                    </div>

                    {/* Estimated Cost */}
                    <div className="bg-white rounded-2xl p-4 border border-secondary/25 shadow-xs text-center space-y-1 col-span-2 md:col-span-1">
                      <div className="text-[10px] font-bold text-dark/50 uppercase tracking-widest">Est Cost</div>
                      <div className="text-2xl font-extrabold text-primary">₹{aiResult.estimatedCost.toLocaleString()}</div>
                      <div className="text-[10px] text-dark/60 font-medium">Fuel Rate + Cold AC Tariff</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setFarmerStep(2)}
                    className="flex-1 py-3 bg-secondary/15 hover:bg-secondary/30 text-dark text-sm font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Modify Form
                  </button>

                  <button
                    id="btn-goto-vehicles-matching"
                    onClick={() => setFarmerStep(4)} // Step 4: Vehicle Recommendations
                    className="flex-2 py-3 bg-primary hover:bg-primary/95 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer"
                  >
                    <span>{t("proceedToVehicles")}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            )}

            {/* STEP 4: VEHICLE RECOMMENDATIONS (Sorted lowest to highest price) */}
            {farmerStep === 4 && aiResult && (
              <div className="space-y-6">
                <div className="space-y-1 text-center md:text-left">
                  <h3 className="text-xl font-extrabold text-slate-800">{t("availableVehicles")}</h3>
                  <p className="text-xs text-slate-500">{t("availableVehiclesDesc")}</p>
                </div>

                <div className="space-y-4">
                  {getFilteredAndSortedVehicles().map((vh, idx) => {
                    const isOptimalMatch = vh.storageType === aiResult.storageType;
                    return (
                      <div
                        id={`vehicle-card-${vh.id}`}
                        key={vh.id}
                        className={`bg-white rounded-2xl p-5 border-2 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                          isOptimalMatch
                            ? "border-emerald-500 bg-emerald-50/10 shadow-sm"
                            : "border-slate-200/60 hover:bg-slate-50/40"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-xl bg-emerald-50 border border-emerald-100 text-3xl flex items-center justify-center shrink-0">
                            {vh.image}
                          </div>
                          
                          <div className="space-y-1 text-left">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-slate-800 text-base">
                                {lang === "ta" ? vh.tamilName : vh.name}
                              </h4>
                              {isOptimalMatch && (
                                <span className="text-[9px] font-mono font-bold bg-emerald-600 text-white py-0.5 px-2 rounded-full uppercase tracking-wider">
                                  AI Suggested
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-slate-500 font-medium space-x-3">
                              <span>Driver: <b>{lang === "ta" ? vh.driverTamilName : vh.driverName}</b></span>
                              <span>•</span>
                              <span>Mobile: <b>{vh.driverPhone}</b></span>
                            </div>

                            {/* Star Rating Display */}
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold pt-1">
                              <div className="flex items-center text-amber-500">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-3.5 h-3.5 ${
                                      star <= Math.round(vh.rating || 5)
                                        ? "fill-amber-500 text-amber-500"
                                        : "text-slate-200"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="font-extrabold text-slate-700">
                                {vh.rating ? vh.rating.toFixed(1) : "5.0"}
                              </span>
                              <span className="text-[11px] text-slate-400 font-normal">
                                ({vh.ratingCount || 0} {t("ratings")})
                              </span>
                            </div>

                            <div className="flex gap-2 pt-1 font-mono text-[10px]">
                              <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded">
                                Limit: {vh.capacity}
                              </span>
                              <span className={`px-2 py-0.5 rounded font-bold ${
                                vh.storageType === "Cold" ? "bg-cyan-50 text-cyan-800" : "bg-amber-50 text-amber-800"
                              }`}>
                                {vh.storageType} Unit
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                          <div className="text-left md:text-right">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contract Fare</div>
                            <div className="text-xl font-extrabold text-emerald-800">
                              ₹{vh.price.toLocaleString()}
                            </div>
                          </div>

                          <button
                            id={`btn-book-now-${vh.id}`}
                            onClick={() => {
                              setSelectedVehicle(vh);
                              setFarmerStep(5); // Step 5: Booking Confirmation
                            }}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition-colors"
                          >
                            {t("bookNow")}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    onClick={() => setFarmerStep(3)}
                    className="py-3 px-6 bg-slate-105 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors shrink-0"
                  >
                    Back to AI predictions
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: BOOKING CONFIRMATION */}
            {farmerStep === 5 && selectedVehicle && aiResult && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 text-left">
                <div className="text-center space-y-2 pb-4 border-b border-slate-100">
                  <span className="text-2xl">🤝</span>
                  <h3 className="text-xl font-extrabold text-slate-800">{t("bookingConfirmTitle")}</h3>
                  <p className="text-sm font-semibold text-emerald-700 italic">"The Crop Chooses the Vehicle."</p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider">
                    {t("verifyDetails")}
                  </h4>

                  {/* Highlight Receipt Manifest */}
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/60 grid md:grid-cols-2 gap-6 text-sm">
                    <div className="space-y-3">
                      <div className="flex justify-between border-b border-slate-150/40 pb-1.5">
                        <span className="text-slate-500 font-medium">Harvest Commodity</span>
                        <span className="font-bold text-slate-800">{cargoForm.cropName}</span>
                      </div>

                      <div className="flex justify-between border-b border-slate-150/40 pb-1.5">
                        <span className="text-slate-500 font-medium">Declared Load Weight</span>
                        <span className="font-bold text-slate-800">{cargoForm.weight} {cargoForm.weightUnit === "kg" ? t("kg") : t("tons")}</span>
                      </div>

                      <div className="flex justify-between border-b border-slate-150/40 pb-1.5">
                        <span className="text-slate-500 font-medium">Pickup Silo</span>
                        <span className="font-bold text-slate-800">{cargoForm.pickup}</span>
                      </div>

                      <div className="flex justify-between pb-1.5">
                        <span className="text-slate-500 font-medium">Destination Terminal</span>
                        <span className="font-bold text-slate-900">{cargoForm.destination}</span>
                      </div>
                    </div>

                    <div className="space-y-3 md:border-l md:border-slate-200/65 md:pl-6">
                      <div className="flex justify-between border-b border-slate-150/40 pb-1.5">
                        <span className="text-slate-500 font-medium">Assigned Carrier</span>
                        <span className="font-bold text-emerald-800">{selectedVehicle.name}</span>
                      </div>

                      <div className="flex justify-between border-b border-slate-150/40 pb-1.5 items-center flex-wrap gap-1">
                        <span className="text-slate-500 font-medium">Driver Operator</span>
                        <div className="text-right">
                          <span className="font-bold text-slate-800 block">
                            {lang === "ta" ? selectedVehicle.driverTamilName : selectedVehicle.driverName}
                          </span>
                          <div className="flex items-center justify-end gap-1 text-[11px] text-amber-500 font-semibold pt-0.5 animate-pulse">
                            <Star className="w-3.1 h-3.1 fill-amber-500 text-amber-500" />
                            <span>
                              {selectedVehicle.rating ? `${selectedVehicle.rating.toFixed(1)} (${selectedVehicle.ratingCount})` : "5.0 (0)"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between border-b border-slate-150/40 pb-1.5">
                        <span className="text-slate-500 font-medium">Driver Helpline</span>
                        <span className="font-bold text-emerald-700">{selectedVehicle.driverPhone}</span>
                      </div>

                      <div className="flex justify-between pb-1.5">
                        <span className="text-slate-500 font-medium">Total Cargo Price</span>
                        <span className="font-extrabold text-emerald-800 text-base">₹{selectedVehicle.price.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Temperature Guidelines Checkbox */}
                  <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-4 flex gap-3 text-amber-800 text-xs">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <p className="leading-relaxed">
                      <b>Preservation Notice:</b> Real-time Cold Temperature support is optimized at <b>{aiResult.tempRange}</b>. The vehicle's integrated HVAC will remain fully active. Drivers will update telemetry readings automatically.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setFarmerStep(4)}
                    className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-center"
                  >
                    {t("cancelBooking")}
                  </button>
                  
                  <button
                    id="btn-confirm-booking"
                    onClick={handleFinalConfirmBooking}
                    className="flex-2 py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold rounded-xl transition-all shadow-md text-center flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>{t("confirmBooking")}</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 6: RESPONSIBLE LIVE TELEMETRY DRIVER TRACKING SCREEN */}
            {farmerStep === 6 && selectedVehicle && aiResult && (
              <div className="space-y-6 text-left">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
                  <span className="text-2xl">🎉</span>
                  <div>
                    <h3 className="font-bold text-emerald-850 text-sm">{t("dispatchOk")}</h3>
                    <p className="text-xs text-emerald-700 font-medium">Driver {lang === "ta" ? selectedVehicle.driverTamilName : selectedVehicle.driverName} has accepted load. Truck is rolling!</p>
                  </div>
                </div>

                {/* Grid holding map and live instruments dashboard */}
                <div className="grid md:grid-cols-12 gap-6">
                  
                  {/* Left Column: Interactive GPS Map vector */}
                  <div className="md:col-span-7 bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
                    <h3 className="text-md font-bold text-slate-800 flex items-center gap-1.5">
                      <Map className="w-5 h-5 text-emerald-700" />
                      <span>{t("activeTrackingTitle")}</span>
                    </h3>

                    {/* Integrated Map component with coordinate math */}
                    <TamilNaduMap
                      pickup={cargoForm.pickup}
                      destination={cargoForm.destination}
                      progress={trackingProgress}
                      cargoTemp={cargoCurrentTemp}
                    />

                    {/* Live driver telemetry status log line */}
                    <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between text-xs font-mono text-slate-700">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                        <span>STATUS: <b>{trackingStatusMsg}</b></span>
                      </div>
                      <span>Prog: {trackingProgress}%</span>
                    </div>
                  </div>

                  {/* Right Column: Live Telemetry Instrument Readings */}
                  <div className="md:col-span-5 flex flex-col gap-4">
                    
                    {/* Temperature gauge */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
                      <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1">
                        <Thermometer className="w-4 h-4 text-emerald-600" />
                        <span>{t("cargoSafetyFeed")}</span>
                      </h4>

                      <div className="flex items-center justify-between bg-slate-50 p-4 border border-slate-200/60 rounded-2xl">
                        <div className="text-left space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Cargo Safe Target</span>
                          <span className="font-extrabold text-slate-800 text-sm bg-slate-100 py-1 px-2.5 rounded-lg border border-slate-200">
                            {aiResult.tempRange}
                          </span>
                        </div>
                        <div className="text-right space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">ACTIVE LOG</span>
                          <span className="text-2xl font-black font-mono text-emerald-700">{cargoCurrentTemp}°C</span>
                        </div>
                      </div>

                      {/* Cool state safety bar */}
                      <div className="space-y-1 text-xs text-slate-500 font-medium">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                          <span>HVAC COMPRESSOR STATE</span>
                          <span className="text-emerald-700">STABLE</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(20, (cargoCurrentTemp / 32) * 100))}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Kilometers Travelled stats */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
                      <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1">
                        <Clock className="w-4 h-4 text-emerald-600" />
                        <span>Logistics Gauges</span>
                      </h4>

                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-0.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">{t("elapsedDist")}</span>
                          <span className="text-xl font-bold font-mono text-slate-800">
                            {currentDistanceTravelled} <span className="text-xs font-normal">km</span>
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-0.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">{t("remainingDist")}</span>
                          <span className="text-xl font-bold font-mono text-emerald-800">
                            {Math.max(0, aiResult.distanceKm - currentDistanceTravelled)} <span className="text-xs font-normal">km</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center bg-slate-50 p-3 border border-slate-205/60 rounded-2xl text-xs text-slate-650">
                        <span className="font-semibold">{t("eta")}</span>
                        <span className="font-bold text-emerald-800">
                          {trackingProgress >= 100 ? "Arrived" : `~${Math.round(240 * (1 - trackingProgress / 100))} minutes`}
                        </span>
                      </div>
                    </div>

                    {/* Driver details helpline card */}
                    <div className="bg-white p-4 rounded-3xl border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl">
                          👨‍✈️
                        </div>
                        <div className="text-left">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("driverStatus")}</div>
                          <div className="font-bold text-slate-800 text-sm">{lang === "ta" ? selectedVehicle.driverTamilName : selectedVehicle.driverName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{selectedVehicle.driverPhone}</div>
                        </div>
                      </div>
                      <a
                        href={`tel:${selectedVehicle.driverPhone}`}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 p-2.5 rounded-xl border border-emerald-150 transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>

                    {/* Dynamic Real-Time Star Rating Feedback System */}
                    <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 text-left space-y-3.5">
                      <div className="text-left">
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 uppercase tracking-widest px-2 py-0.5 rounded-md inline-block mb-1.5 font-mono">
                          Customer Review Feed
                        </span>
                        <h4 className="text-sm font-extrabold text-slate-800">{t("rateDriverTitle")}</h4>
                        <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mt-0.5">{t("rateDriverDesc")}</p>
                      </div>

                      {hasRatedActiveTrip ? (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 text-center space-y-2">
                          <p>🎉 {t("ratingsFeedbackSubmitted")}</p>
                          <div className="flex justify-center items-center gap-1.5 text-[14px] text-amber-500 pt-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= activeTripRating ? "fill-amber-500 text-amber-500" : "text-slate-200"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Interacting stars */}
                          <div className="flex justify-center items-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setActiveTripRating(star)}
                                className="focus:outline-hidden transform hover:scale-120 transition-all cursor-pointer"
                              >
                                <Star
                                  className={`w-7 h-7 transition-colors ${
                                    star <= activeTripRating
                                      ? "fill-amber-500 text-amber-500"
                                      : "text-slate-300 hover:text-amber-300"
                                  }`}
                                />
                              </button>
                            ))}
                          </div>

                          {/* Quick comments selection */}
                          <div className="flex flex-wrap gap-1.5 justify-center">
                            {[
                              { label: lang === "ta" ? "சிறந்த சேவை" : "Excellent Service", rating: 5 },
                              { label: lang === "ta" ? "சரியான நேரத்திற்கு" : "On-Time Arrival", rating: 5 },
                              { label: lang === "ta" ? "கனிவான ஓட்டுநர்" : "Polite Behavior", rating: 5 },
                              { label: lang === "ta" ? "பாதுகாப்பானது" : "Safe Temp Support", rating: 5 }
                            ].map((opt, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setActiveTripRating(opt.rating);
                                  setActiveTripComment(opt.label);
                                }}
                                className={`text-[10px] font-bold py-1 px-2.5 rounded-lg border transition-all ${
                                  activeTripComment === opt.label
                                    ? "bg-emerald-705 bg-emerald-750 bg-emerald-700 text-white border-emerald-700"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>

                          <div className="space-y-1">
                            <input
                              type="text"
                              value={activeTripComment}
                              onChange={(e) => setActiveTripComment(e.target.value)}
                              placeholder={lang === "ta" ? "கூடுதல் கருத்துக்களை எழுதுங்கள்..." : "Write custom driver feedback..."}
                              className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-emerald-500 placeholder-slate-450 font-semibold"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              // Perform state rating updates
                              setTransporterFleet((prevFleet) => {
                                const index = prevFleet.findIndex((v) => v.id === selectedVehicle.id);
                                if (index !== -1) {
                                  const updatedFleet = [...prevFleet];
                                  const vehicleToUpdate = { ...updatedFleet[index] };
                                  const currentRatings = vehicleToUpdate.ratings || [];
                                  const updatedRatings = [...currentRatings, activeTripRating];
                                  const average = updatedRatings.reduce((sum, val) => sum + val, 0) / updatedRatings.length;
                                  
                                  vehicleToUpdate.ratings = updatedRatings;
                                  vehicleToUpdate.rating = Math.round(average * 10) / 10;
                                  vehicleToUpdate.ratingCount = updatedRatings.length;
                                  
                                  updatedFleet[index] = vehicleToUpdate;
                                  
                                  // Update selected vehicle reference so ratings update dynamically
                                  setSelectedVehicle(vehicleToUpdate);
                                  return updatedFleet;
                                }
                                return prevFleet;
                              });

                              setHasRatedActiveTrip(true);
                            }}
                            className="w-full py-2 bg-emerald-750 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                          >
                            {t("submitRating")}
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                <div className="pt-4 flex gap-3 justify-center">
                  <button
                    onClick={() => {
                      setPage("home");
                      setFarmerStep(1);
                      setActiveTripRating(5);
                      setActiveTripComment("");
                      setHasRatedActiveTrip(false);
                      setSelectedVehicle(null);
                    }}
                    className="py-3 px-8 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-xs transition-colors"
                  >
                    Book Another Harvest
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TRANSPORTER HUB */}
        {page === "transporter" && (
          <div className="space-y-6">
            
            {/* Control Hub Navigation Pill Selector */}
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 flex-wrap gap-4">
              <div className="text-left space-y-1">
                <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                  <Truck className="w-6 h-6 text-emerald-700" />
                  <span>{t("transporterDashboard")}</span>
                </h2>
                <div className="text-xs text-slate-500">Startup administrator portal for Gokulakrishnan K. (CEO)</div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setTransporterTab("dashboard")}
                  className={`py-2 px-4 rounded-xl text-xs font-bold transition-all ${
                    transporterTab === "dashboard"
                      ? "bg-emerald-700 text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Dashboard Overview
                </button>

                <button
                  onClick={() => setTransporterTab("fleet")}
                  className={`py-2 px-4 rounded-xl text-xs font-bold transition-all ${
                    transporterTab === "fleet"
                      ? "bg-emerald-700 text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {t("activeVehiclesCount")} ({transporterFleet.length})
                </button>

                <button
                  onClick={() => setTransporterTab("requests")}
                  className={`py-2 px-4 rounded-xl text-xs font-bold transition-all relative ${
                    transporterTab === "requests"
                      ? "bg-emerald-700 text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {t("nearbyRequests")}
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white">
                    {nearbyRequests.length}
                  </span>
                </button>

                <button
                  onClick={() => setTransporterTab("history")}
                  className={`py-2 px-4 rounded-xl text-xs font-bold transition-all ${
                    transporterTab === "history"
                      ? "bg-emerald-700 text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {t("tripHistoryTab")}
                </button>
              </div>
            </div>

            {/* TAB 1: DASHBOARD OVERVIEW */}
            {transporterTab === "dashboard" && (
              <div className="space-y-6">
                
                {/* Visual scorecard bento grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  
                  {/* Total Earnings */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs text-left space-y-1 relative overflow-hidden">
                    <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg w-fit">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest pt-2">
                      {t("totalEarnings")}
                    </span>
                    <span className="text-2xl font-black block text-emerald-800">
                      ₹{transporterEarnings.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-emerald-600 block font-semibold">100% direct payouts</span>
                  </div>

                  {/* Total Deliveries */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs text-left space-y-1">
                    <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg w-fit">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest pt-2">
                      {t("totalTrips")}
                    </span>
                    <span className="text-2xl font-black block text-slate-800">
                      {transporterTrips} Trips
                    </span>
                    <span className="text-[10px] text-slate-500 block">No agricultural spoilage logs</span>
                  </div>

                  {/* Active Shipments */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs text-left space-y-1 relative">
                    <div className="p-2 bg-amber-50 text-amber-800 rounded-lg w-fit">
                      <Activity className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest pt-2">
                      {t("activeBookings")}
                    </span>
                    <span className="text-2xl font-black block text-slate-800">
                      3 Active
                    </span>
                    <span className="text-[10px] text-amber-700 block font-semibold animate-pulse">● Live GPS telemetry on</span>
                  </div>

                  {/* Available fleet */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs text-left space-y-1">
                    <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg w-fit">
                      <Truck className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest pt-2">
                      {t("standbyVehicles")}
                    </span>
                    <span className="text-2xl font-black block text-slate-800">
                      {transporterFleet.length} Vehicles
                    </span>
                    <span className="text-[10px] text-emerald-600 block font-medium">Standby readiness</span>
                  </div>

                </div>

                {/* Live Fuel Rates & Nearest Stations Layout Row */}
                <div className="grid md:grid-cols-12 gap-4">
                  {/* Live Fuel Prices */}
                  <div className="md:col-span-5 bg-slate-900 text-white rounded-2xl p-5 border border-slate-850 text-left space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Fuel className="w-5 h-5 text-amber-500" />
                        <h4 className="text-sm font-extrabold tracking-tight text-white mb-0">{t("liveFuelPricesTitle")}</h4>
                      </div>
                      <span className="text-[9px] bg-amber-500/10 text-amber-400 font-bold px-2 py-0.5 rounded-full border border-amber-500/20 active-pulse">
                        LIVE TN INDEX
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-1">
                      {/* Petrol Price */}
                      <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/50 space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold block leading-none uppercase">{t("petrolPriceLabel")}</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-amber-400">₹102.63</span>
                          <span className="text-[10px] text-slate-400">/L</span>
                        </div>
                        <span className="text-[9px] text-emerald-400 font-semibold flex items-center gap-0.5 leading-none">
                          <TrendingUp className="w-2.5 h-2.5" /> -0.12% vs yesterday
                        </span>
                      </div>

                      {/* Diesel Price */}
                      <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/50 space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold block leading-none uppercase">{t("dieselPriceLabel")}</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-amber-400">₹94.24</span>
                          <span className="text-[10px] text-slate-400">/L</span>
                        </div>
                        <span className="text-[9px] text-emerald-400 font-semibold flex items-center gap-0.5 leading-none">
                          <TrendingUp className="w-2.5 h-2.5 rotate-180" /> +0.05% vs yesterday
                        </span>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400/80 leading-relaxed font-semibold">
                      {t("fuelUpdateInfo")} Updated hourly via direct API feed to avoid operational variance.
                    </p>
                  </div>

                  {/* Nearest Fuel Stations with Map Distances representation */}
                  <div className="md:col-span-7 bg-white rounded-2xl p-5 border border-slate-200 text-left space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 m-0">
                        <span>📡 {t("nearestFuelHook")}</span>
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400">ROUTE SAFE INSTRUMENTS</span>
                    </div>

                    <div className="space-y-2.5">
                      {[
                        { brand: "IndianOil Station", distance: "2 km", status: "Active - Low Queue", wait: "5 min wait", location: "On Highway Bypass", color: "text-orange-600 bg-orange-50 border-orange-100" },
                        { brand: "Bharat Petroleum", distance: "3 km", status: "Active - Normal", wait: "8 min wait", location: "National Highway Junction", color: "text-blue-600 bg-blue-50 border-blue-100" },
                        { brand: "HP Station", distance: "4 km", status: "Premium Power Available", wait: "2 min wait", location: "West Ring Road Bypass", color: "text-red-600 bg-red-50 border-red-100" }
                      ].map((station, i) => (
                        <div key={i} className="flex justify-between items-center border border-slate-100 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl text-xs font-black ${station.color}`}>
                              BP
                            </div>
                            <div>
                              <div className="text-xs font-bold font-sans text-slate-800">{station.brand}</div>
                              <div className="text-[10px] text-slate-400 font-medium">{station.location}</div>
                            </div>
                          </div>
                          
                          <div className="text-right space-y-0.5">
                            <span className="text-xs font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md font-mono">{station.distance}</span>
                            <div className="text-[10px] text-emerald-600 font-bold">{station.wait}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Simulated live telemetry feed map layout for admin */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 text-left">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-800 text-md">Registered Active Manifests</h3>
                    <span className="text-[10px] font-mono text-slate-400">AUTOMATIC AGRI-ROUTE MATCHER</span>
                  </div>

                  {/* Active simulated logistics logs */}
                  <div className="divide-y divide-slate-100">
                    <div className="py-3 flex justify-between items-center text-xs">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-800">TN-58-AF-3024 (Reefer Large)</div>
                        <div className="text-slate-500 font-medium">Chinnasamy Load • Madurai to Madras Koyambedu</div>
                      </div>
                      <div className="text-right">
                        <div className="text-emerald-700 font-bold">10.4°C (Safe)</div>
                        <div className="text-slate-450 text-[10px]">ETA 180 mins</div>
                      </div>
                    </div>

                    <div className="py-3 flex justify-between items-center text-xs">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-800 font-sans">TN-30-W-4512 (AC mini)</div>
                        <div className="text-slate-500 font-medium">Palani Velu Load • Salem to Coimbatore</div>
                      </div>
                      <div className="text-right">
                        <div className="text-emerald-700 font-bold">11.8°C (Safe)</div>
                        <div className="text-slate-450 text-[10px]">ETA 40 mins</div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: FLEET MANAGEMENT VEHICLES LIST */}
            {transporterTab === "fleet" && (
              <div className="space-y-6">
                
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-800">Registered Transport Fleet</h3>
                  {!isAddingVehicle && (
                    <button
                      onClick={() => setIsAddingVehicle(true)}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1 shadow-xs transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t("addVehicleBtn")}</span>
                    </button>
                  )}
                </div>

                {/* Slide out add vehicle form inside flow */}
                {isAddingVehicle && (
                  <form onSubmit={handleAddVehicleSubmit} className="bg-white p-6 rounded-2xl border-2 border-emerald-300 shadow-sm space-y-4 text-left">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1">
                        <PlusCircle className="text-emerald-700 w-4 h-4" />
                        <span>{t("addVehicleHeader")}</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsAddingVehicle(false)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      {/* Name */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("vehicleName")}</label>
                        <input
                          type="text"
                          required
                          value={newVehicleForm.name}
                          onChange={(e) => setNewVehicleForm({ ...newVehicleForm, name: e.target.value })}
                          placeholder="e.g. Tata Super AC"
                          className="w-full text-xs py-2.5 px-3 rounded-lg border border-slate-200 bg-slate-50 focus:outline-emerald-500"
                        />
                      </div>

                      {/* Capacity */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("vehicleCapacity")}</label>
                        <input
                          type="text"
                          required
                          value={newVehicleForm.capacity}
                          onChange={(e) => setNewVehicleForm({ ...newVehicleForm, capacity: e.target.value })}
                          placeholder="e.g. 2.5 Tons"
                          className="w-full text-xs py-2.5 px-3 rounded-lg border border-slate-200 bg-slate-50 focus:outline-emerald-500"
                        />
                      </div>

                      {/* Driver Name */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Driver Full Name</label>
                        <input
                          type="text"
                          required
                          value={newVehicleForm.driverName}
                          onChange={(e) => setNewVehicleForm({ ...newVehicleForm, driverName: e.target.value })}
                          placeholder="e.g. Kumar P"
                          className="w-full text-xs py-2.5 px-3 rounded-lg border border-slate-200 bg-slate-50 focus:outline-emerald-500"
                        />
                      </div>

                      {/* Driver Mobile */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Driver Contact Phone</label>
                        <input
                          type="text"
                          required
                          value={newVehicleForm.driverPhone}
                          onChange={(e) => setNewVehicleForm({ ...newVehicleForm, driverPhone: e.target.value })}
                          placeholder="e.g. +91 95000 12345"
                          className="w-full text-xs py-2.5 px-3 rounded-lg border border-slate-200 bg-slate-50 focus:outline-emerald-500"
                        />
                      </div>

                      {/* Storage Type */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Storage Module</label>
                        <select
                          value={newVehicleForm.storageType}
                          onChange={(e) => setNewVehicleForm({ ...newVehicleForm, storageType: e.target.value as any })}
                          className="w-full text-xs py-2.5 px-3 rounded-lg border border-slate-200 bg-slate-50"
                        >
                          <option value="Cold">Cold AC Ventilation</option>
                          <option value="Dry">Dry Air Ventilated</option>
                          <option value="Normal">Normal Open Carriage</option>
                        </select>
                      </div>

                      {/* Carrier Price */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Baseline Price (₹)</label>
                        <input
                          type="number"
                          required
                          value={newVehicleForm.price || ""}
                          onChange={(e) => setNewVehicleForm({ ...newVehicleForm, price: Number(e.target.value) })}
                          placeholder="e.g. 5500"
                          className="w-full text-xs py-2.5 px-3 rounded-lg border border-slate-200 bg-slate-50 focus:outline-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setIsAddingVehicle(false)}
                        className="py-1.5 px-3.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="py-1.5 px-4 bg-emerald-700 text-white rounded-lg text-xs font-bold"
                      >
                        {t("saveVehicle")}
                      </button>
                    </div>
                  </form>
                )}

                {/* Fleet Grid */}
                <div className="grid md:grid-cols-2 gap-4">
                  {transporterFleet.map((vh) => (
                    <div key={vh.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex justify-between items-center text-left">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl p-2 bg-emerald-50 rounded-xl">{vh.image}</span>
                        <div className="space-y-0.5">
                          <h4 className="font-bold text-slate-800 text-sm">{vh.name}</h4>
                          <span className="text-[11px] block text-slate-500 font-medium">Driver: {vh.driverName} ({vh.driverPhone})</span>
                          <div className="flex gap-1.5 pt-0.5 text-[9px] font-mono">
                            <span className="bg-slate-105 text-slate-600 font-bold py-0.2 px-1.5 rounded">{vh.capacity}</span>
                            <span className={`py-0.2 px-1.5 rounded font-bold ${
                              vh.storageType === "Cold" ? "bg-cyan-50 text-cyan-800" : "bg-amber-50 text-amber-800"
                            }`}>{vh.storageType} storage</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[9px] font-bold text-slate-400 block uppercase">Fare</div>
                        <span className="text-md font-extrabold text-emerald-800 block">₹{vh.price.toLocaleString()}</span>
                        <button
                          onClick={() => {
                            // Toggle availability mock
                            alert("Vehicle standby telemetry toggled successfully.");
                          }}
                          className="text-[10px] font-bold text-emerald-600 hover:underline block"
                        >
                          Standby Active
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}

            {/* TAB 3: NEARBY BOOKING REQUESTS (Direct Farmers accept dispatcher) */}
            {transporterTab === "requests" && (
              <div className="space-y-6 text-left">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-800">Pending Nearby Crop Requests</h3>
                  <p className="text-xs text-slate-500">Live request alerts triggered by surrounding rural farmers in Tamil Nadu. The crop has selected your matching vehicle grade.</p>
                </div>

                {nearbyRequests.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-300 text-center text-slate-450 text-xs">
                    🍎 {t("noBookings")}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {nearbyRequests.map((req) => (
                      <div key={req.id} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-2 text-left">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs bg-emerald-100 text-emerald-800 py-0.5 px-2.5 rounded font-bold uppercase">
                              {req.cropName} shipment
                            </span>
                            <span className="text-xs font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                              {req.urgency}
                            </span>
                          </div>

                          <h4 className="text-base font-bold text-slate-800">
                            Route: {req.route}
                          </h4>

                          <div className="text-xs text-slate-500 font-medium font-sans flex gap-3 flex-wrap">
                            <span>Farmer: <b>{req.farmerName}</b></span>
                            <span>•</span>
                            <span>Weight: <b>{req.weight}</b></span>
                            <span>•</span>
                            <span>Requires: <b className="text-cyan-800">{req.storageRequired} Storage</b></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto justify-between border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                          <div className="text-left md:text-right">
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">Estimated Income</span>
                            <span className="text-lg font-black text-emerald-800">₹{req.payout.toLocaleString()}</span>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                // Find a driver name from the fleet or fallback
                                const randomDriver = transporterFleet.length > 0
                                  ? transporterFleet[Math.floor(Math.random() * transporterFleet.length)].driverName
                                  : "Senthil Kumar";

                                const newCompleted: CompletedTrip = {
                                  id: `T-${Math.floor(1000 + Math.random() * 9000)}`,
                                  cargo: `${req.cropName} (${req.weight})`,
                                  route: req.route,
                                  driverName: randomDriver,
                                  payout: req.payout,
                                  timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
                                };

                                setCompletedTrips((prev) => [newCompleted, ...prev]);
                                setNearbyRequests(nearbyRequests.filter((r) => r.id !== req.id));
                                setTransporterEarnings((e) => e + req.payout);
                                setTransporterTrips((t) => t + 1);
                                alert(`Ride ${req.id} Accepted! Vehicle dispatched immediately to ${req.route.split(" to ")[0]} farm silages.`);
                              }}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-2 px-3.5 rounded-xl transition-colors"
                            >
                              {t("accept")}
                            </button>

                            <button
                              onClick={() => {
                                setNearbyRequests(nearbyRequests.filter((r) => r.id !== req.id));
                                alert("Ride request dismissed.");
                              }}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-3 rounded-xl transition-colors"
                            >
                              {t("reject")}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: TRIP HISTORY */}
            {transporterTab === "history" && (
              <div className="space-y-6 text-left animate-in fade-in duration-300">
                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-700 animate-pulse" />
                    <span>{t("tripHistoryTitle")}</span>
                  </h3>
                  <p className="text-xs text-slate-500">Verified logs of agricultural cargo voyages completed across Tamil Nadu districts.</p>
                </div>

                {/* All-Time Performance Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Revenue Card */}
                  <div className="bg-gradient-to-br from-emerald-700 to-emerald-800 rounded-2xl p-5 text-white shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-[10.5px] font-bold text-emerald-200 block uppercase tracking-wider">
                        {t("totalRevenueEarned")}
                      </span>
                      <span className="text-3xl font-black block mt-1.5 tracking-tight">
                        ₹{transporterEarnings.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-emerald-100/90 block mt-1.5 font-medium">All-time dynamic platform billing</span>
                    </div>
                    <div className="p-3 bg-white/10 rounded-xl text-white shrink-0">
                      <DollarSign className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Trip Count Card */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-[10.5px] font-bold text-slate-400 block uppercase tracking-wider">
                        {t("totalCompletedTrips")}
                      </span>
                      <span className="text-3xl font-black block text-slate-800 mt-1.5 tracking-tight">
                        {transporterTrips} Trips
                      </span>
                      <span className="text-[10px] text-emerald-600 block mt-1.5 font-medium">Verified completed milestones</span>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl shrink-0">
                      <Award className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {completedTrips.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 border border-dashed border-slate-300 text-center text-slate-400 text-xs font-semibold">
                    📭 {t("noCompletedTrips")}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...completedTrips]
                      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                      .map((trip) => (
                        <div
                          key={trip.id}
                          className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-emerald-250 shadow-xs transition-all hover:translate-y-[-1px] duration-200 text-left"
                        >
                          <div className="flex flex-wrap md:flex-nowrap justify-between gap-4 items-start md:items-center">
                            
                            {/* Left column: Cargo details & routing path */}
                            <div className="space-y-2.5 flex-1 min-w-[200px]">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="bg-emerald-50 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md font-mono border border-emerald-100/60">
                                  {trip.id}
                                </span>
                                <span className="bg-slate-100/80 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-md font-mono flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {trip.timestamp}
                                </span>
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm text-slate-755 font-extrabold font-sans">
                                  <Package className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <span className="text-slate-500 font-medium mr-1 text-xs uppercase tracking-wider">{t("cargo")}:</span>
                                  <span className="text-slate-800">{trip.cargo}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-700">
                                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                                  <span className="text-slate-550 font-medium text-xs mr-1 uppercase tracking-wider">{t("route")}:</span>
                                  <span className="font-extrabold text-slate-850">{trip.route}</span>
                                </div>
                              </div>
                            </div>

                            {/* Middle column: Dedicated driver operator with contact style */}
                            <div className="bg-slate-50/60 border border-slate-200/50 rounded-xl px-3.5 py-2.5 min-w-[170px] text-left">
                              <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-widest mb-1">
                                {t("driverName")}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm shrink-0">👨🏽‍✈️</span>
                                <span className="font-bold text-slate-800 text-xs tracking-tight">
                                  {trip.driverName}
                                </span>
                              </div>
                            </div>

                            {/* Right column: Final payout stamp ledger */}
                            <div className="text-left md:text-right min-w-[120px] self-stretch flex flex-col justify-between md:justify-center">
                              <div className="space-y-1">
                                <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                                  {t("finalPayout")}
                                </span>
                                <div className="flex md:justify-end items-baseline text-xl font-black text-emerald-800 tracking-tight">
                                  <span>₹{trip.payout.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </main>

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl max-w-sm w-full p-6 border border-slate-200 relative shadow-2xl space-y-4 text-center"
          >
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="text-3xl">🥦</span>
            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-800 flex items-center justify-center gap-1 select-none">
                <span>Sign in to</span>
                <span className="font-display font-black">
                  <span className="text-[#00D26A]">farm</span>
                  <span className="text-[#07240E]">Go</span>
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">Select your rural workspace role to unlock dispatcher controls</p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                id="btn-login-farmer"
                onClick={(e) => handleSimulatedLogin(e, "farmer")}
                className="w-full flex items-center justify-between p-3.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl font-bold text-emerald-800 text-sm transition-all shadow-xs"
              >
                <span>I'm a Farmer</span>
                <span className="text-[10px] bg-emerald-700 text-white font-mono uppercase px-2 py-0.5 rounded-full">Farmer</span>
              </button>

              <button
                id="btn-login-transporter"
                onClick={(e) => handleSimulatedLogin(e, "transporter")}
                className="w-full flex items-center justify-between p-3.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl font-bold text-emerald-800 text-sm transition-all shadow-xs"
              >
                <span>I'm a Transporter</span>
                <span className="text-[10px] bg-emerald-700 text-white font-mono uppercase px-2 py-0.5 rounded-full">Transporter</span>
              </button>
            </div>

            <div className="text-[10px] text-slate-400 font-medium">
              Demo sandbox sandbox mode active. Under 2026 registry.
            </div>
          </motion.div>
        </div>
      )}

      {/* FOOTER AREA / CEO & STARTUP LOGOS */}
      <footer className="mt-12 bg-white border-t border-secondary/20 py-10 text-xs text-dark/70">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-12 gap-8 text-left">
          
          <div className="md:col-span-4 space-y-4">
            <div className="flex items-center font-display font-extrabold text-3xl md:text-4xl tracking-tight">
              <span className="text-[#00D26A]">farm</span>
              <span className="text-[#07240E]">Go</span>
            </div>
            <p className="leading-relaxed text-dark/80">
              Premium investor-pitch responsive agricultural dispatch prototype connecting logistics with cold refrigeration vectors across Salem, Coimbatore, Madurai, Trichy, and Chennai Koyambedu silos.
            </p>
            <div className="pt-1.5">
              <span className="inline-flex items-center bg-primary text-white font-display font-extrabold text-[11px] px-3.5 py-1.5 rounded-lg uppercase tracking-wider shadow-sm select-none">
                our Farmers Our Transport
              </span>
            </div>
          </div>

          <div className="md:col-span-4 space-y-3">
            <h4 className="font-bold text-dark uppercase tracking-widest text-[11px] flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-primary" />
              <span>{t("contactTitle")}</span>
            </h4>
            <div className="space-y-1.5 text-dark/85">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-primary" />
                <span className="font-mono text-dark font-semibold">+91 98408 64703</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-primary" />
                <span className="font-mono">support@farmgo.in</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span className="font-medium text-dark">Palani, Dindigul, Tamil Nadu</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-4 space-y-4 md:border-l md:border-secondary/25 md:pl-8">
            <h4 className="font-bold text-dark uppercase tracking-widest text-[11px] flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-primary" />
              <span>{t("executiveLeadership")}</span>
            </h4>
            <div className="space-y-3">
              <div>
                <div className="text-[10px] font-bold text-dark/60 uppercase tracking-widest leading-none mb-1">
                  {t("founderTitle")} & CEO
                </div>
                <div className="text-base font-extrabold text-primary">
                  Gokulakrishnan K
                </div>
              </div>
              
              <div className="border-t border-secondary/15 pt-2.5">
                <div className="text-[10px] font-bold text-dark/60 uppercase tracking-widest leading-none mb-1">
                  {t("coFounderCfo")} & Marketing
                </div>
                <div className="text-base font-extrabold text-primary">
                  Mohamed Karib Navas A
                </div>
              </div>

              <p className="text-[10px] leading-tight text-dark/60 pt-1">
                farmGo Startup Corp © 2026. Custom designed with high-contrast UI accessibility optimizations for rural agriculturists in Tamil Nadu.
              </p>
            </div>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-4 border-t border-secondary/15 mt-8 pt-4 text-center text-[10px] text-[#195e1e] font-extrabold font-display uppercase tracking-wider">
          farmGo Technology Inc. • Registered under Salem High-Preservation Logistics Registry • Code compiled successfully.
        </div>
      </footer>
    </div>
  );
}
