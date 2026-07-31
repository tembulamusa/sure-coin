import React, {useContext} from "react";
import { Modal } from "react-bootstrap";
import { Context } from "../context/store"
import "../App.css";
import BodyLogin from './auth/body-login';
import SureCoinLogoImg from "../assets/surecoin/logo.png";

const LoginModal = () => {
    const [state, dispatch] = useContext(Context);

    const setUser = (user) => {
        if (user) {
            dispatch({ type: "SET", key: "user", payload: user });
            dispatch({ type: "DEL", key: "sessionMessage" });
        }
    };

    const closeModal = () => {
        dispatch({type:"SET", key:"showloginmodal", payload:false});
    };

    return (
        <Modal
            animation={false}
            show={state?.showloginmodal == true}
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
                    <span>Login to Surecoin</span>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="sc-login-modal__body p-0">
                <BodyLogin setUser={setUser} key={state?.showloginmodal ? "open" : "closed"} />
            </Modal.Body>
        </Modal>
    )
}

export default LoginModal;
