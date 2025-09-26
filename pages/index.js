// pages/index.js
import { useState } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

const targets = {
  calories: 2000,
  protein: 150, // grams
  fat: 70,      // grams
  carbs: 250,   // grams
};

function MacroCircle({ label, value, max, color }) {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div className="w-28 h-28 mx-4">
      <CircularProgressbar
        value={percentage}
        text={`${Math.round(value)}`}
        maxValue={100}
        styles={buildStyles({
          textSize: "24px",
          pathColor: color,
          textColor: "#111",
          trailColor: "#ddd",
          strokeLinecap: "round",
        })}
      />
      <p className="text-center mt-2 font-semibold text-gray-700">{label}</p>
      <p className="text-center text-sm text-gray-500">{value} / {max}</p>
    </div>
  );
}

function getNutrient(food, nutrient) {
  const serving = food.servings?.serving;
  if (serving) {
    const firstServing = Array.isArray(serving) ? serving[0] : serving;
    const val = Number(firstServing[nutrient]);
    if (!isNaN(val) && val > 0) return val;
  }

  // Fallback parsing food_description or nutritional_info strings
  if (food.nutritional_info || food.food_description) {
    const text = food.nutritional_info || food.food_description || "";
    const regexMap = {
      calories: /Calories:\s*([\d.]+)/i,
      fat: /Fat:\s*([\d.]+)/i,
      carbohydrate: /Carbs?:\s*([\d.]+)/i,
      protein: /Protein:\s*([\d.]+)/i,
    };
    const match = text.match(regexMap[nutrient]);
    if (match) return Number(match[1]);
  }
  return 0;
}

export default function Calify() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [dailyFoods, setDailyFoods] = useState([]);

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    try {
      const res = await fetch(`/api/search-food?q=${encodeURIComponent(searchTerm)}`);
      const data = await res.json();

      if (data.foods?.food) {
        const foods = Array.isArray(data.foods.food) ? data.foods.food : [data.foods.food];
        setSearchResults(foods);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      alert("Error fetching food data");
    }
  }

  function addFood(food) {
    setDailyFoods([...dailyFoods, { ...food, quantity: 1 }]);
  }

  function updateQuantity(index, qty) {
    if (qty < 1) return;
    const newList = [...dailyFoods];
    newList[index].quantity = qty;
    setDailyFoods(newList);
  }

  // Calculate totals
  const totals = dailyFoods.reduce(
    (acc, food) => {
      const qty = food.quantity || 1;
      acc.calories += getNutrient(food, "calories") * qty;
      acc.fat += getNutrient(food, "fat") * qty;
      acc.carbs += getNutrient(food, "carbohydrate") * qty;
      acc.protein += getNutrient(food, "protein") * qty;
      return acc;
    },
    { calories: 0, fat: 0, carbs: 0, protein: 0 }
  );

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center p-6 text-gray-900 font-sans">
      <h1 className="text-6xl font-extrabold mb-12 tracking-tight text-gray-800">Calify</h1>

      {/* Search */}
      <form onSubmit={handleSearch} className="w-full max-w-xl flex mb-6">
        <input
          type="text"
          placeholder="Search food..."
          className="flex-grow border border-gray-300 rounded-l-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button
          type="submit"
          className="bg-gray-700 text-white px-6 rounded-r-md hover:bg-gray-800 transition"
        >
          Search
        </button>
      </form>

      {/* Search results */}
      <div className="w-full max-w-xl mb-10 space-y-3">
        {searchResults.length === 0 && <p className="text-gray-600">No results</p>}
        {searchResults.map((food) => (
          <div
            key={food.food_id}
            className="flex justify-between items-center border border-gray-300 rounded-md p-3 hover:bg-gray-100 transition"
          >
            <div>
              <p className="font-semibold text-gray-800">{food.food_name}</p>
              <p className="text-sm text-gray-600">{food.food_type}</p>
              <p className="text-xs text-gray-500 truncate max-w-xs">
                Per {food.servings?.serving?.metric_serving_amount || "100"} {food.servings?.serving?.metric_serving_unit || "g"} - Calories: {getNutrient(food, "calories")} kcal | Fat: {getNutrient(food, "fat")}g | Carbs: {getNutrient(food, "carbohydrate")}g | Protein: {getNutrient(food, "protein")}g
              </p>
            </div>
            <button
              onClick={() => addFood(food)}
              className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition"
            >
              Add
            </button>
          </div>
        ))}
      </div>

      {/* Daily foods list */}
      <section className="w-full max-w-xl bg-white border border-gray-300 rounded-md p-4 shadow-sm">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Today's Foods</h2>
        {dailyFoods.length === 0 && <p className="text-gray-600">No foods added yet</p>}

        <ul className="space-y-3">
          {dailyFoods.map((food, idx) => (
            <li key={`${food.food_id}-${idx}`} className="flex justify-between items-center border border-gray-200 rounded-md p-2">
              <div>
                <p className="font-semibold">{food.food_name}</p>
                <p className="text-xs text-gray-500">
                  Calories: {getNutrient(food, "calories") * food.quantity} kcal | Fat: {getNutrient(food, "fat") * food.quantity}g | Carbs: {getNutrient(food, "carbohydrate") * food.quantity}g | Protein: {getNutrient(food, "protein") * food.quantity}g
                </p>
              </div>
              <input
                type="number"
                min="1"
                value={food.quantity}
                onChange={(e) => updateQuantity(idx, parseInt(e.target.value))}
                className="w-16 border border-gray-300 rounded-md text-center"
              />
            </li>
          ))}
        </ul>
      </section>

      {/* Macro speedometer graphs */}
      <section className="mt-12 flex justify-center gap-8">
        <MacroCircle
          label="Calories"
          value={totals.calories}
          max={targets.calories}
          color="#4B5563"
        />
        <MacroCircle
          label="Protein (g)"
          value={totals.protein}
          max={targets.protein}
          color="#374151"
        />
        <MacroCircle
          label="Fat (g)"
          value={totals.fat}
          max={targets.fat}
          color="#6B7280"
        />
        <MacroCircle
          label="Carbs (g)"
          value={totals.carbs}
          max={targets.carbs}
          color="#9CA3AF"
        />
      </section>
    </main>
  );
}
