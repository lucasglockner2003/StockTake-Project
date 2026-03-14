# 🍽️ SmartOps — Voice-Driven Restaurant Stock Management System

SmartOps is a workflow-focused inventory system designed to solve real operational bottlenecks in large restaurant kitchens.

Traditional stocktaking can take **6–7 hours**, requires manual transcription, and is highly error-prone in fast-paced environments.

SmartOps reduces counting time dramatically by introducing **voice input, smart matching, visual alerts, and automated order suggestions.**

---

## 🚀 Live Product Vision

The long-term goal is to evolve SmartOps into a **multi-restaurant SaaS inventory platform** that combines:

* Voice automation
* Operational intelligence
* Predictive ordering
* Kitchen-optimized UX

---

## ⚡ Core Features

### 📊 Stock Take Interface

* Ultra-fast quantity input for high-pressure environments
* Real-time stock health indicators:

  * Critical
  * Low
  * Check
  * Good
* Dynamic border color alerts for quick scanning
* Ideal stock comparison logic
* Smart grouping by kitchen area

---

### 🎤 Voice Stock Take Engine

* Speech recognition powered stock counting
* Automatic parsing of spoken inventory lines
* Fuzzy product matching system
* Manual correction workflow for unmatched items
* **Auto Apply Mode** → instantly updates inventory values

Designed for:

* Loud kitchens
* Gloves usage
* Minimal typing
* Fast movement workflows

---

### ✅ Review & Validation Page

* Full session review before applying changes
* Matched vs unmatched entry validation
* Prevents accidental stock corruption
* Supports manual quantity adjustments

---

### 🧾 Suggested Order Generator

* Automatically calculates suggested purchase quantities
* Prevents:

  * Over-ordering
  * Stockouts
  * Waste
* Based on ideal stock thresholds

---

### 💾 Smart Persistence Layer

* LocalStorage session auto-save
* Crash / refresh recovery support
* Maintains area order workflow

---

## 🧠 System Architecture (Current)

Frontend-only operational engine with local state persistence.

```
Voice Input → Parsing Engine → Fuzzy Match Layer → Review Queue → Auto Apply → Stock State Update → Suggested Order Logic
```

---

## 🛠️ Tech Stack

* React (Functional Components + Hooks)
* Vite (Fast build tooling)
* JavaScript
* Web Speech API
* LocalStorage persistence
* Custom fuzzy matching logic

---

## 🧪 Product Design Constraints

SmartOps UX decisions were based on real kitchen realities:

* Workers under time pressure
* Wet / gloved hands
* Loud background noise
* Need for instant visual feedback
* Large tap targets
* Minimal navigation depth

---

## 📈 Performance Goal

Reduce full-restaurant stocktaking time from:

**6–7 hours → under 2 hours**

while improving data accuracy.

---

## 🔮 Roadmap

### Phase 1 (In Progress)

* Voice preview editing improvements
* Manual matched-item correction
* Export to CSV / XLSX

### Phase 2

* Multi-restaurant support
* SaaS architecture
* Authentication & roles
* Cloud database integration

### Phase 3

* Tablet optimized PWA
* Predictive ordering
* Analytics dashboard
* Inventory history tracking
* AI consumption forecasting

---

## 💡 Why This Project Exists

This system was built to:

* Reduce operational cost
* Reduce human error
* Improve ordering decisions
* Digitize legacy kitchen workflows

---

## ▶️ How to Run Locally

```bash
npm install
npm run dev
```

---

## 📌 Status

Active development — new features and architecture improvements ongoing.
