import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { useAuth } from "../auth/AuthContext";
import api from "../lib/api";
import {
  User,
  Lock,
  ArrowRight,
  ShieldPlus,
  MapPin,
  Badge,
  Key,
} from "lucide-react";

export default function LoginPage() {
  const [screen, setScreen] = useState("login");
  const [systemId, setSystemId] = useState("");
  const [password, setPassword] = useState("");
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [regData, setRegData] = useState({
    first_name: "",
    last_name: "",
    employee_hr_id: "",
    role: "",
    system_id: "",
    password: "",
    assigned_barangay: "",
  });
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      const redirect = await login(systemId.toUpperCase(), password);
      Swal.fire({
        icon: "success",
        title: "Login Successful",
        text: "Routing to dashboard...",
        timer: 1500,
        showConfirmButton: false,
      }).then(() => {
        navigate(redirect);
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Login Failed",
        text: error.response?.data?.error || "Invalid credentials",
      });
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      setUserEmail(user.email);
      setRegData((prev) => ({
        ...prev,
        first_name: user.displayName?.split(" ")[0] || "",
        last_name: user.displayName?.split(" ").slice(-1)[0] || "",
      }));
      setScreen("profile");
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Authentication Failed",
        text: "Google Sign-In failed. Please try again.",
      });
    }
  };

  const handleRoleChange = async (e) => {
    const role = e.target.value;
    setRegData((prev) => ({ ...prev, role, system_id: "Generating..." }));
    try {
      const response = await api.post("/api/get-next-id", { role });
      if (response.data.success) {
        setRegData((prev) => ({ ...prev, system_id: response.data.next_id }));
      } else {
        setRegData((prev) => ({ ...prev, system_id: "Error generating ID" }));
      }
    } catch (error) {
      setRegData((prev) => ({ ...prev, system_id: "Server offline" }));
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (
      !regData.system_id ||
      regData.system_id === "Generating..." ||
      regData.system_id === "Error generating ID"
    ) {
      Swal.fire({
        icon: "warning",
        title: "Invalid ID",
        text: "Please select a valid role to generate your System ID.",
      });
      return;
    }
    try {
      await register({
        ...regData,
        email: userEmail,
      });
      Swal.fire({
        icon: "success",
        title: "Profile Submitted!",
        text: "Please wait for HR Approval.",
        confirmButtonColor: "#0ea5e9",
      }).then(() => setScreen("login"));
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Registration Failed",
        text: error.response?.data?.error || "Server error",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <ShieldPlus className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">HEALTH-INTEL</h2>
          <p className="text-gray-600">
            {screen === "login" && "Secure LGU Access Portal"}
            {screen === "gateway" && "Step 1: Security Verification"}
            {screen === "profile" && "Step 2: Complete Employee Profile"}
          </p>
        </div>

        {screen === "login" && (
          <form onSubmit={handleLoginSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                System ID / Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={systemId}
                  onChange={(e) => setSystemId(e.target.value)}
                  placeholder="e.g. BHW-001"
                  className="mt-1 block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition"
            >
              Secure Login
              <ArrowRight className="w-4 h-4" />
            </button>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setScreen("gateway")}
                className="text-sm text-blue-600 hover:underline"
              >
                Don't have an account? Request Access
              </button>
            </div>
          </form>
        )}

        {screen === "gateway" && (
          <div>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded">
              <h4 className="font-bold text-blue-800">Data Privacy Notice</h4>
              <p className="text-sm text-gray-700">
                By accessing this government system, you agree to the Data
                Privacy Act of 2012. All interactions are logged.
              </p>
              <label className="flex items-center gap-2 mt-2 cursor-pointer font-semibold text-gray-800">
                <input
                  type="checkbox"
                  checked={privacyChecked}
                  onChange={(e) => setPrivacyChecked(e.target.checked)}
                  className="h-4 w-4"
                />
                I acknowledge and agree to the terms.
              </label>
            </div>
            <button
              onClick={handleGoogleLogin}
              disabled={!privacyChecked}
              className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md font-bold text-white transition ${
                privacyChecked
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                {/* Google icon */}
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              Sign in with Google
            </button>
            <div className="mt-4 text-center">
              <button
                onClick={() => setScreen("login")}
                className="text-sm text-blue-600 hover:underline"
              >
                Back to Login
              </button>
            </div>
          </div>
        )}

        {screen === "profile" && (
          <form onSubmit={handleRegisterSubmit}>
            <div className="bg-blue-100 border-l-4 border-blue-500 p-3 mb-4 rounded">
              <span className="text-xs text-blue-700">
                Google Account Verified:
              </span>
              <strong className="block text-gray-900">
                {userEmail} (Verified)
              </strong>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <input
                  type="text"
                  value={regData.first_name}
                  onChange={(e) =>
                    setRegData({ ...regData, first_name: e.target.value })
                  }
                  placeholder="Juan"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <input
                  type="text"
                  value={regData.last_name}
                  onChange={(e) =>
                    setRegData({ ...regData, last_name: e.target.value })
                  }
                  placeholder="Dela Cruz"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Assign Role
                </label>
                <select
                  value={regData.role}
                  onChange={handleRoleChange}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="" disabled>
                    Select position...
                  </option>
                  <option value="bhw">Barangay Health Worker</option>
                  <option value="mho">MHO Physician</option>
                  <option value="admin">LGU Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  System ID
                </label>
                <input
                  type="text"
                  value={regData.system_id}
                  readOnly
                  className="mt-1 w-full px-3 py-2 bg-gray-100 text-gray-500 border border-gray-300 rounded-md font-bold"
                />
              </div>
            </div>
            {regData.role === "bhw" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Assign to Barangay (Required for BHW)
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    value={regData.assigned_barangay}
                    onChange={(e) =>
                      setRegData({
                        ...regData,
                        assigned_barangay: e.target.value,
                      })
                    }
                    className="mt-1 block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="" disabled>
                      Select assigned barangay...
                    </option>
                    <option value="Alegria">Brgy. Alegria</option>
                    <option value="Blumentritt">Brgy. Blumentritt</option>
                    <option value="Poblacion">Brgy. Poblacion</option>
                    <option value="San Jose">Brgy. San Jose</option>
                    <option value="Santa Cruz">Brgy. Santa Cruz</option>
                    <option value="Talabas">Brgy. Talabas</option>
                    <option value="Zone 1">Brgy. Zone 1</option>
                  </select>
                </div>
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Official HR Employee ID
              </label>
              <div className="relative">
                <Badge className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={regData.employee_hr_id}
                  onChange={(e) =>
                    setRegData({ ...regData, employee_hr_id: e.target.value })
                  }
                  placeholder="EMP-2026-123"
                  className="mt-1 block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700">
                Create System Password
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  value={regData.password}
                  onChange={(e) =>
                    setRegData({ ...regData, password: e.target.value })
                  }
                  placeholder="Create a strong password"
                  className="mt-1 block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition"
            >
              Submit for HR Approval
            </button>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setScreen("login")}
                className="text-sm text-blue-600 hover:underline"
              >
                Cancel Request
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
