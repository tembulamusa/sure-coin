import React, { useState, useContext, useEffect } from "react";
import { Formik, Form } from "formik";
import mpesa from "../../assets/img/mpesa.png";
import { Context } from "../../context/store";
import { Modal } from "react-bootstrap";
import makeRequest from "../utils/fetch-request";
import Alert from "../utils/alert";
import { getFromLocalStorage, setLocalStorage } from "../utils/local-storage";

const DepositModal = () => {
  const [state, dispatch] = useContext(Context);
  const [depositMessage, setDepositMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState("deposit");
  const user = state?.user || getFromLocalStorage("user");

  const initialValues = {
    amount: state?.promptdepositrequest?.payableAmt || 50,
  };

  useEffect(() => {
    setDepositMessage(state?.promptdepositrequest?.message || null);
    if (state?.promptdepositrequest?.mode === "withdraw") {
      setMode("withdraw");
    } else {
      setMode("deposit");
    }
  }, [state?.promptdepositrequest]);

  const applyBalance = (response) => {
    if (!user) return;
    const nextUser = {
      ...user,
      cash_balance: response.cash ?? user.cash_balance,
      bonus_balance: response.bonus ?? user.bonus_balance,
      balance: response.total ?? user.balance,
    };
    setLocalStorage("user", nextUser);
    dispatch({ type: "SET", key: "user", payload: nextUser });
  };

  const handleSubmit = (values) => {
    if (!user?.token) {
      setDepositMessage({ status: 400, message: "Please login first" });
      dispatch({ type: "SET", key: "showloginmodal", payload: true });
      return;
    }
    const endpoint = mode === "withdraw" ? "withdraw" : "deposit";
    setIsLoading(true);
    setDepositMessage(null);
    makeRequest({
      url: endpoint,
      method: "POST",
      data: { amount: Number(values.amount) },
      api_version: "sureCoin",
    }).then(([status, response]) => {
      setIsLoading(false);
      if (status === 200 && (response?.status === 200 || response?.cash != null)) {
        applyBalance(response);
        setDepositMessage({
          status: 200,
          message:
            response?.message ||
            (mode === "withdraw" ? "Withdrawal successful" : "Deposit successful"),
        });
      } else {
        setDepositMessage({
          status: 400,
          message:
            response?.error?.description ||
            response?.result ||
            response?.message ||
            `${mode === "withdraw" ? "Withdrawal" : "Deposit"} failed`,
        });
      }
    });
  };

  const validate = (values) => {
    const errors = {};
    const minAmt = state?.promptdepositrequest?.payableAmt || 10;
    if (!values.amount || Number(values.amount) < minAmt || Number(values.amount) > 70000) {
      errors.amount = `Please enter amount between KES ${minAmt} and KES 70,000.00`;
    }
    return errors;
  };

  const MyDepositForm = ({ errors, values, setFieldValue }) => {
    const onFieldChanged = (ev) => {
      setFieldValue(ev.target.name, ev.target.value);
    };

    return (
      <Form className="rounded border-0">
        <div className="pt-0">
          <div className="row px-3">
            <div className="text-center">
              <img src={mpesa} alt="Wallet" />
            </div>
          </div>
          <div className="d-flex gap-2 justify-content-center mt-2">
            <button
              type="button"
              className={`btn btn-sm ${mode === "deposit" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setMode("deposit")}
            >
              Deposit
            </button>
            <button
              type="button"
              className={`btn btn-sm ${mode === "withdraw" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setMode("withdraw")}
            >
              Withdraw
            </button>
          </div>
          <hr className="my-2" />
          {depositMessage && (
            <div className="my-3 font-bold">
              <Alert message={depositMessage} font={"light"} />
            </div>
          )}
          <div className="form-group row d-flex justify-content-center mt-4">
            <div className="row">
              <div>
                <input
                  onChange={onFieldChanged}
                  className="text-dark deposit-input form-control input-field"
                  id="amount"
                  name="amount"
                  type="text"
                  value={values.amount}
                  placeholder="Enter Amount"
                />
                {errors.amount && <div className="text-danger"> {errors.amount} </div>}
              </div>
              <div className="col-8 mt-3">
                <button
                  disabled={isLoading}
                  type="submit"
                  className="w-full btn btn-lg btn-primary bg-primary deposit-withdraw-butto font-[500]"
                >
                  {isLoading ? "wait..." : mode === "withdraw" ? "Withdraw" : "Deposit"}
                </button>
              </div>
              <div className="col-4 mt-3">
                <div
                  onClick={() => dispatch({ type: "DEL", key: "promptdepositrequest" })}
                  className="w-full btn btn-lg btn-warning deposit-withdraw-butto font-[500]"
                >
                  Close
                </div>
              </div>
            </div>
          </div>
        </div>
      </Form>
    );
  };

  return (
    <Modal
      show={state?.promptdepositrequest?.show}
      onHide={() => dispatch({ type: "DEL", key: "promptdepositrequest" })}
      dialogClassName="popover-login-modal"
      aria-labelledby="contained-modal-title-vcenter"
    >
      <Modal.Body className="p-4">
        <Alert
          message={{
            status: 400,
            message:
              mode === "withdraw"
                ? "Withdraw cash from your SureCoin wallet"
                : "Deposit to continue playing",
          }}
        />
        <Formik
          initialValues={initialValues}
          enableReinitialize
          onSubmit={handleSubmit}
          validateOnChange={false}
          validateOnBlur={false}
          validate={validate}
        >
          {(props) => <MyDepositForm {...props} />}
        </Formik>
      </Modal.Body>
    </Modal>
  );
};

export default DepositModal;
