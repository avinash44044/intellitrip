[![Watch the demo](https://img.youtube.com/vi/UsspulCANAk/0.jpg)](https://www.youtube.com/watch?v=UsspulCANAk)


# 🌍 intellitrip – Adaptive Smart Travel Itinerary Generator  
A hybrid **AI + Rule-Based travel planner** that builds fully personalized itineraries using user preferences, TravelDNA scoring, real-time weather, live events, crowd levels, and Google Maps data.

---

## 🚀 Overview  
**intellitrip** is an intelligent itinerary generator that creates day-wise travel plans tailored to the user’s interests, travel style, season, weather, and destination trends.  
The system blends **generative AI (Google Gemini)** + **rule-based logic** and a **TravelDNA profiling model** to dynamically generate accurate, practical and personalized itineraries.

The project provides:  
✔ Dynamic daily itineraries  
✔ Live weather integration  
✔ Smart POI (points of interest) filtering  
✔ Crowd & season-aware scheduling  
✔ Real-time event suggestions  
✔ Adaptive TravelDNA personalization  
✔ Smooth React UI with animated backgrounds

---

## 🧠 Key Features

### 🔹 **1. AI-Powered Itinerary Generation**
- Uses **Google Gemini (Generative AI)**  
- Understands user preferences: budget, interests, travel days, trip purpose  
- Generates detailed day-wise schedules with timings, descriptions & travel flow  
- Automatically adjusts for:
  - Weather  
  - Crowd levels  
  - Holiday seasons  
  - Festivals & events  

---

### 🔹 **2. TravelDNA Profiling Engine**
A dynamic personalization model that scores POIs using:

### 🔹 **3. Real-time Weather Integration**
Uses **Open-Meteo Weather API** to fetch:  
- Temperature  
- Rain probability  
- Cloud cover  
- Sunset/Sunrise  
- Destination timezone  
- 7-day forecast  

Weather affects:
- Day-wise plan order  
- Outdoor/indoor switching  
- Activity duration adjustments  

---

### 🔹 **4. Events & Map Data Integration**
- Pulls events & festival data via **Google Maps Places / Events API**  
- Recommends:
  - Concerts  
  - Exhibitions  
  - Local festivals  
  - Nightlife events  
- Includes travel time, opening hours & rush hours intelligently

---

### 🔹 **5. Fully Responsive React Frontend**
- Clean & modern UI  
- Dynamic background images based on destination  
- Nice animations & UI polish  
- Easy-to-use input form  
- Smooth itinerary card view with collapsible sections

---

## 🧱 Tech Stack

### **Frontend**
- React.js (Vite)  
- Tailwind CSS  
- Lucide Icons  
- Framer Motion  
- Axios  

### **Backend**
- Node.js  
- Express.js  
- Google Gemini API  
- Open-Meteo API  
- Google Maps API  

### **Database**
- MongoDB  
(stores user preferences, past itineraries, TravelDNA profile)


---

## ⚙️ How It Works (Architecture)

### **1. User enters trip details**
Destination → Dates → Budget → Interests → Travel Style → Travelers → Constraints

### **2. Backend fetches data**
- Weather
- Events
- Places/POI
- Maps timing & distance
- User’s TravelDNA profile

### **3. AI + Rules Processing**
1. **Rule Engine** filters POIs  
2. **TravelDNA Model** ranks POIs  
3. **Weather Engine** rearranges days  
4. **Gemini** converts structured data → human-like itinerary  
5. Itinerary sent back to UI

### **4. UI displays day-wise schedule**
Each day includes:
- Activities  
- Maps links  
- Travel time  
- Best timings  
- Food recommendations  
- Weather notes  

---

## 🛠 Setup Instructions

### **1️⃣ Clone the Project**
```bash
git clone avinash44044
cd intellitrip

Backend Setup
cd backend
npm install

Frontend Setup
npm install
npm run dev


