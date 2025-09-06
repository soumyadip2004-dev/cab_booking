import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function RapidoClone() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [mobile, setMobile] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    pickup: "",
    drop: "",
    date: "",
    time: "",
  });
  const [rideBooked, setRideBooked] = useState(false);

  const rider = {
    name: "Amit Kumar",
    phone: "+91 9876543210",
    cost: "₹180",
    routeMap: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3...",
  };

  const handleLogin = () => {
    if (mobile.length === 10) setLoggedIn(true);
    else alert("Enter valid 10-digit mobile number");
  };

  const handleBook = () => {
    if (!formData.name || !formData.pickup || !formData.drop) {
      alert("Please fill all details");
      return;
    }
    setRideBooked(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-yellow-50 p-4">
      <Card className="w-full max-w-md shadow-xl rounded-2xl">
        <CardContent className="space-y-6 p-6">
          {!loggedIn ? (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold text-center">Login</h1>
              <input
                type="tel"
                placeholder="Enter Mobile Number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full border p-2 rounded-lg"
              />
              <Button onClick={handleLogin} className="w-full bg-yellow-500">
                Continue
              </Button>
            </div>
          ) : !rideBooked ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Passenger Details</h2>
              <input
                type="text"
                placeholder="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border p-2 rounded-lg"
              />
              <input
                type="text"
                placeholder="Pickup Location"
                value={formData.pickup}
                onChange={(e) => setFormData({ ...formData, pickup: e.target.value })}
                className="w-full border p-2 rounded-lg"
              />
              <input
                type="text"
                placeholder="Drop Location"
                value={formData.drop}
                onChange={(e) => setFormData({ ...formData, drop: e.target.value })}
                className="w-full border p-2 rounded-lg"
              />
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full border p-2 rounded-lg"
              />
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full border p-2 rounded-lg"
              />
              <Button onClick={handleBook} className="w-full bg-green-600">
                Book Ride
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Ride Confirmed ✅</h2>
              <p><strong>Passenger:</strong> {formData.name}</p>
              <p><strong>From:</strong> {formData.pickup}</p>
              <p><strong>To:</strong> {formData.drop}</p>
              <p><strong>Date & Time:</strong> {formData.date} {formData.time}</p>

              <h3 className="text-lg font-semibold mt-4">Rider Details</h3>
              <p><strong>Name:</strong> {rider.name}</p>
              <p><strong>Phone:</strong> {rider.phone}</p>
              <p><strong>Cost:</strong> {rider.cost}</p>

              <div className="mt-2 w-full h-64">
                <iframe
                  src={rider.routeMap}
                  className="w-full h-full rounded-lg"
                  allowFullScreen=""
                  loading="lazy"
                ></iframe>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
