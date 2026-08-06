import React, {useContext} from "react";
import { Modal } from "react-bootstrap";
import { Context } from "../context/store"
import "../App.css";
import BodyLogin from './auth/body-login';
import BodyRegister from './auth/body-register';
import SureCoinLogoImg from "../assets/surecoin/logo.png";

const LoginModal = () => {
    const [state, dispatch] = useContext(Context);
    const mode = state?.authModalMode === "register" ? "register" : "login";
    const isOpen = state?.showloginmodal == true;

    const setUser = (user) => {
        if (user) {
            dispatch({ type: "SET", key: "user", payload: user });
            dispatch({ type: "DEL", key: "sessionMessage" });
        }
    };

    const closeModal = () => {
        dispatch({type:"SET", key:"showloginmodal", payload:false});
        dispatch({type:"DEL", key:"authModalMode"});
    };

    return (
        <Modal
            animation={false}
            show={isOpen}
            onHide={closeModal}
            dialogClassName="popover-login-modal sc-login-modal"
            contentClassName="sc-login-modal__content"
            aria-labelledby="sc-login-title"
            centered
        >
            <Modal.Header closeButton className="sc-login-modal__header">
                <Modal.Title id="sc-login-title" className="sc-login-modal__title">
                    <img
                        src={SureCoinLogoImg}
                        alt="Surecoin"
                        className="sc-login-modal__logo"
                    />
                    <span>{mode === "register" ? "Register for Surecoin" : "Login to Surecoin"}</span>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="sc-login-modal__body p-0">
                {mode === "register" ? (
                    <BodyRegister setUser={setUser} key={isOpen ? "reg-open" : "reg-closed"} />
                ) : (
                    <BodyLogin setUser={setUser} key={isOpen ? "login-open" : "login-closed"} />
                )}
            </Modal.Body>
        </Modal>
    )
}

export default LoginModal;
