import { useState } from "react";
import axios from "axios";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const sendOtp = async () => {
    const URL = `${import.meta.env.VITE_API_URL}/api/forgot-password`
    try {
      const res = await axios.post(
        URL,
        { email }
      );
      //console.log(res);
      alert(res.data.message);      
      setStep(2);
      //setEmail("");
    } catch (error: any) {
      alert(error.response.data.message);
    }
  };
const verifyOtp = async () => {
    // Implement OTP verification logic here
    //console.log("Verifying OTP:", otp);
    
    const URL = `${import.meta.env.VITE_API_URL}/api/verify-otp`
    try {
      const res = await axios.post(
        URL,
        { email, otp }
      );
      //console.log("OTP verification response:", res);
      //console.log(res);
      alert(res.data.message);
      setStep(3);
    } catch (error: any) {
      console.log(error.response.data.message);
    }
  }; 
  const resetPassword = async () => {
    const URL = `${import.meta.env.VITE_API_URL}/api/reset-password`
    try {
      const res = await axios.post(
        URL,
        {
          email,
          otp,
          password,
        }
      );

      alert(res.data.message);
      setStep(4);
    } catch (error: any) {
      console.log(error.response.data.message);
    }
  };
  return (
    <div className="max-w-md mx-auto p-4 border rounded">
      <h2 className="text-xl mb-4">Forgot Password</h2>

      {/* {message && <p className="text-green-600">{message}</p>} */}
 
        {step === 1 && (
        <>
          <input
            className="border p-2 w-full mb-2"
            placeholder="Enter email"
            onChange={(e) => setEmail(e.target.value)}
          />
          <button onClick={sendOtp} className="bg-blue-500 text-white p-2 w-full">
            Send OTP
          </button>
        </>
         )}

      {step === 2 && (
        <>
          <input
            className="border p-2 w-full mb-2"
            placeholder="Enter OTP"
            onChange={(e) => setOtp(e.target.value)}
          />
          <button onClick={verifyOtp} className="bg-blue-500 text-white p-2 w-full">
            Verify OTP
          </button>
        </>
      )}

      {step === 3 && (
        <>
          <input
            type="password"
            className="border p-2 w-full mb-2"
            placeholder="New Password"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={resetPassword} className="bg-green-500 text-white p-2 w-full">
            Reset Password
          </button>
        </>
      )}

      {step === 4 && (
        <>
        <p className="text-green-600">Password reset successful!</p>
        <a href="/" className="text-green-600">
          Click here to login
        </a >
        </>
      ) }
    </div>
  );
};

export default ForgotPassword;