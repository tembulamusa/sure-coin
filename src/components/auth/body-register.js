import React, { useState, useCallback, useEffect } from "react";
import Row from "react-bootstrap/Row";
import { Formik, Form } from "formik";
import makeRequest from "../utils/fetch-request";
import { getFromLocalStorage, setLocalStorage } from "../utils/local-storage";
import Alert from "../utils/alert";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import {
  buildSurecoinSignupPayload,
  isValidSurecoinMsisdn,
} from "../utils/surecoin-auth-payload";

const RegisterFormFields = React.memo(function RegisterFormFields({
  errors,
  values,
  submitForm,
  setFieldValue,
  isLoading,
  generalErrorMessage,
  dispatch,
  openLogin,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  const onFieldChanged = (ev) => {
    let field = ev.target.name;
    let value = ev.target.value;
    if (field === "msisdn") {
      value = value.trim();
    }
    setFieldValue(field, value);
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitForm();
    }
  };

  return (
    <div className="sc-login-form">
      <Form>
        <Row className="g-0">
          <div className="sc-login-field">
            <label className="sc-login-label" htmlFor="sc-reg-msisdn">
              Mobile Phone
            </label>
            <input
              type="text"
              id="sc-reg-msisdn"
              name="msisdn"
              className={`sc-login-input ${errors.msisdn ? "is-invalid" : ""}`}
              placeholder={errors.msisdn || "07xxxxxxxx"}
              onChange={(ev) => onFieldChanged(ev)}
              value={values.msisdn}
              autoComplete="tel"
            />
          </div>
          <div className="sc-login-field">
            <label className="sc-login-label" htmlFor="sc-reg-displayName">
              Display Name <span className="sc-login-optional">(optional)</span>
            </label>
            <input
              type="text"
              id="sc-reg-displayName"
              name="displayName"
              className="sc-login-input"
              placeholder="Player name"
              onChange={(ev) => onFieldChanged(ev)}
              value={values.displayName}
              autoComplete="nickname"
            />
          </div>
          <div className="sc-login-field">
            <label className="sc-login-label" htmlFor="sc-reg-password">
              Password
            </label>
            <div className="sc-login-password-wrap">
              <input
                type={showPassword ? "text" : "password"}
                id="sc-reg-password"
                name="password"
                className={`sc-login-input ${
                  errors.password ? "is-invalid" : ""
                }`}
                placeholder={errors.password || "Min. 4 characters"}
                onChange={(ev) => onFieldChanged(ev)}
                value={values.password}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="sc-login-eye"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaRegEye /> : <FaRegEyeSlash />}
              </button>
            </div>
          </div>
          <div className="sc-login-field">
            <label className="sc-login-label" htmlFor="sc-reg-password2">
              Confirm Password
            </label>
            <div className="sc-login-password-wrap">
              <input
                type={showPassword2 ? "text" : "password"}
                id="sc-reg-password2"
                name="password2"
                className={`sc-login-input ${
                  errors.password2 ? "is-invalid" : ""
                }`}
                placeholder={errors.password2 || "Repeat password"}
                onChange={(ev) => onFieldChanged(ev)}
                onKeyPress={handleKeyPress}
                value={values.password2}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="sc-login-eye"
                aria-label={
                  showPassword2 ? "Hide password" : "Show password"
                }
                onClick={() => setShowPassword2(!showPassword2)}
              >
                {showPassword2 ? <FaRegEye /> : <FaRegEyeSlash />}
              </button>
            </div>
          </div>
          {generalErrorMessage && (
            <div className="sc-login-alert-block">
              <Alert message={generalErrorMessage} />
            </div>
          )}
          <div className="sc-login-actions">
            <button
              type="button"
              className="sc-login-btn sc-login-btn--ghost"
              onClick={() => {
                dispatch({ type: "SET", key: "showloginmodal", payload: false });
                dispatch({ type: "DEL", key: "authModalMode" });
              }}
            >
              Cancel
            </button>
            <button
              className="sc-login-btn sc-login-btn--primary"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? <span>Creating …</span> : <span>Register</span>}
            </button>
          </div>
          <button
            type="button"
            className="sc-login-link-btn sc-login-link-btn--muted"
            onClick={openLogin}
          >
            Already have an account? Login
          </button>
        </Row>
      </Form>
    </div>
  );
});

const BodyRegister = (props) => {
  const { setUser, dispatch, isModalOpen, contextUser } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [generalErrorMessage, setGeneralErrorMessage] = useState(null);
  const [user, setLocalUser] = useState(() => getFromLocalStorage("user"));

  const initialValues = {
    msisdn: "",
    displayName: "",
    password: "",
    password2: "",
  };

  useEffect(() => {
    if (isModalOpen) {
      setLocalUser(getFromLocalStorage("user"));
    }
  }, [isModalOpen, contextUser]);

  const Notify = useCallback(
    (signupMessage) => {
      if (![200, 201, 204].includes(signupMessage.status)) return;

      setLocalStorage("user", signupMessage.user);
      setLocalUser(signupMessage.user);

      if (isModalOpen && typeof setUser === "function") {
        setUser(signupMessage.user);
      }
      dispatch({ type: "DEL", key: "showloginmodal" });
      dispatch({ type: "DEL", key: "authModalMode" });
      dispatch({ type: "DEL", key: "sessionMessage" });
    },
    [dispatch, setUser, isModalOpen]
  );

  useEffect(() => {
    if (message !== null) {
      Notify(message);
    }
  }, [message, Notify]);

  const handleSubmit = (values) => {
    setIsLoading(true);
    setGeneralErrorMessage(null);
    const data = buildSurecoinSignupPayload(values);

    makeRequest({
      url: "auth/signup",
      method: "POST",
      data,
      api_version: "sureCoinPublic",
    }).then(([status, response]) => {
      if ([200, 201, 204].includes(status)) {
        if (
          (response?.status == 200 || response?.status == 201) &&
          response?.data?.token
        ) {
          setMessage({ user: response.data, status: 200 });
        } else if (response?.data?.token) {
          setMessage({ user: response.data, status: 200 });
        } else {
          setGeneralErrorMessage({
            status: 400,
            message:
              response?.error?.description ||
              response?.result ||
              response?.message ||
              "Registration failed",
          });
        }
      } else {
        setGeneralErrorMessage({
          status: 400,
          message:
            response?.error?.description ||
            response?.result ||
            response?.message ||
            "Registration failed",
        });
      }
      setIsLoading(false);
    });
  };

  const validate = (values) => {
    const errors = {};
    if (!isValidSurecoinMsisdn(values.msisdn)) {
      errors.msisdn = "Invalid phone number";
    }
    if (!values.password || values.password.length < 4) {
      errors.password = "Password must be at least 4 characters";
    }
    if (values.password2 !== values.password) {
      errors.password2 = "Passwords don't match";
    }
    return errors;
  };

  const openLogin = useCallback(() => {
    dispatch({ type: "SET", key: "authModalMode", payload: "login" });
    dispatch({ type: "SET", key: "showloginmodal", payload: true });
  }, [dispatch]);

  return (
    <>
      {user && (
        <div className="sc-login-already">
          <div className="sc-login-already__title">
            You are already logged in.
          </div>
          <div className="sc-login-already__actions">
            <button
              type="button"
              className="sc-login-btn sc-login-btn--ghost"
              onClick={() => {
                dispatch({ type: "SET", key: "showloginmodal", payload: false });
                dispatch({ type: "DEL", key: "authModalMode" });
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
      {!user && (
        <Formik
          initialValues={initialValues}
          onSubmit={handleSubmit}
          validateOnChange={false}
          validateOnBlur={false}
          validate={validate}
        >
          {(formProps) => (
            <RegisterFormFields
              {...formProps}
              isLoading={isLoading}
              generalErrorMessage={generalErrorMessage}
              dispatch={dispatch}
              openLogin={openLogin}
            />
          )}
        </Formik>
      )}
    </>
  );
};

export default React.memo(BodyRegister);
