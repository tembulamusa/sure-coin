import React, {useContext} from "react";
import { Modal } from "react-bootstrap";
import { Context } from "../context/store"
import "../App.css";
import BodyLogin from './auth/body-login';

const LoginModal = () => {
    const [state, dispatch] = useContext(Context);

    const setUser = (user) => {
        if (user) {
            dispatch({ type: "SET", key: "user", payload: user });
        }
    };

    return (
        <Modal
            animation={false}
            show={state?.showloginmodal == true}
            onHide={() => dispatch({type:"SET", key:"showloginmodal", payload:false})}
            dialogClassName="popover-login-modal"
            aria-labelledby="contained-modal-title-vcenter"
        >
            <Modal.Header closeButton className="no-header">
                <Modal.Title>LOGIN TO SURECOIN</Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
                <BodyLogin setUser={setUser}/>
            </Modal.Body>
        </Modal>
    )
}

export default LoginModal;
