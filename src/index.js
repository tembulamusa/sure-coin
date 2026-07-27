import React, { Suspense } from "react";
import { createRoot } from 'react-dom/client';
import {
    BrowserRouter,
    Route,
    Routes,
} from 'react-router-dom'
import reportWebVitals from './reportWebVitals';
import 'bootstrap/dist/css/bootstrap.min.css';
import './assets/css/surecoin.css';
import './assets/css/surecoin-shell.css';
import './index.css';
import 'react-toastify/dist/ReactToastify.css'
import Store from './context/store';
import Signup from './components/pages/signup';
import ResetPassword from './components/pages/auth/reset-password';
import VerifyAccount from './components/pages/auth/verify-account';
import Logout from "./components/pages/auth/logout";
import ForgotPassword from "./components/pages/auth/forgot-password";
import SureCoin from "./components/pages/sure-coin";
import LoginModal from "./components/loginmodal";
import DepositModal from "./components/webmodals/deposit-modal";

const container = document.getElementById("app");

const App = () => {
    return (
        <BrowserRouter>
            <div className="launched-casino-wrapper">
                <Suspense fallback={<p></p>}>
                    <Routes>
                        <Route path="/surecoin" element={<SureCoin />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/signup/:promoCode" element={<Signup />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/verify-account" element={<VerifyAccount />} />
                        <Route path="/logout" element={<Logout />} />
                        <Route path="*" element={<SureCoin />} />
                    </Routes>
                    <LoginModal />
                    <DepositModal />
                </Suspense>
            </div>
        </BrowserRouter>
    )
}

const root = createRoot(container);
root.render(<Store><App /></Store>);

reportWebVitals();
