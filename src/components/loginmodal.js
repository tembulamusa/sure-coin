import React, { useCallback, useContext, useMemo } from "react";
import { Modal } from "react-bootstrap";
import { Context } from "../context/store"
import "../App.css";
import BodyLogin from './auth/body-login';
import BodyRegister from './auth/body-register';
import SureCoinLogoImg from "../assets/surecoin/logo.png";

/**
 * Memoized shell: only re-renders when auth-relevant props change.
 * Parent LoginModal still sees every Context update (iscoinrotating, etc.),
 * but this view and the form bodies stay put so typed fields / focus survive.
 */
const LoginModalView = React.memo(function LoginModalView({
    isOpen,
    mode,
    sessionMessage,
    contextUser,
    dispatch,
    setUser,
}) {
    const closeModal = useCallback(() => {
        dispatch({ type: "SET", key: "showloginmodal", payload: false });
        dispatch({ type: "DEL", key: "authModalMode" });
    }, [dispatch]);

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
                    <BodyRegister
                        key={isOpen ? "reg-open" : "reg-closed"}
                        setUser={setUser}
                        dispatch={dispatch}
                        isModalOpen={isOpen}
                        contextUser={contextUser}
                    />
                ) : (
                    <BodyLogin
                        key={isOpen ? "login-open" : "login-closed"}
                        setUser={setUser}
                        dispatch={dispatch}
                        isModalOpen={isOpen}
                        sessionMessage={sessionMessage}
                        contextUser={contextUser}
                    />
                )}
            </Modal.Body>
        </Modal>
    );
});

const LoginModal = () => {
    const [state, dispatch] = useContext(Context);
    const mode = state?.authModalMode === "register" ? "register" : "login";
    const isOpen = state?.showloginmodal == true;
    const sessionMessage = state?.sessionMessage ?? null;
    const contextUser = state?.user ?? null;

    const setUser = useCallback((user) => {
        if (user) {
            dispatch({ type: "SET", key: "user", payload: user });
            dispatch({ type: "DEL", key: "sessionMessage" });
        }
    }, [dispatch]);

    const authProps = useMemo(
        () => ({
            isOpen,
            mode,
            sessionMessage,
            contextUser,
            dispatch,
            setUser,
        }),
        [isOpen, mode, sessionMessage, contextUser, dispatch, setUser]
    );

    return <LoginModalView {...authProps} />;
};

export default LoginModal;
