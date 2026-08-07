import React, { useState, useEffect, useCallback } from "react";
import Row from "react-bootstrap/Row";
import { Formik, Form } from "formik";
import makeRequest from "../utils/fetch-request";
import { getFromLocalStorage, setLocalStorage } from "../utils/local-storage";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Alert from "../utils/alert";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import {
  buildSurecoinCredentialsPayload,
  isValidSurecoinMsisdn,
} from "../utils/surecoin-auth-payload";

const navigateAwayRoutes = ["/login", "/signup"];

const LoginFormFields = React.memo(function LoginFormFields({
  errors,
  values,
  submitForm,
  setFieldValue,
  isLoading,
  sessionMessage,
  alertVerifyMessage,
  generalErrorMessage,
  dispatch,
  navigateAway,
}) {
  const [showPassword, setShowPassword] = useState(false);

  const onFieldChanged = (ev) => {
    let field = ev.target.name;
    let value = ev.target.value;
    if (field == "msisdn") {
      value = value.trim();
    }
    setFieldValue(field, value);
  };

  const handleKeyPress = (event) => {
    if (event.key == "Enter") {
      event.preventDefault();
      submitForm();
    }
  };

  return (
    <div className="sc-login-form">
      <Form>
        {sessionMessage && (
          <div className="sc-login-session-alert">{sessionMessage}</div>
        )}
        <Row className="g-0">
          <div className="sc-login-field">
            <label className="sc-login-label" htmlFor="sc-login-msisdn">
              Mobile Phone
            </label>
            <input
              type="text"
              id="sc-login-msisdn"
              name="msisdn"
              className={`sc-login-input ${errors.msisdn ? "is-invalid" : ""}`}
              data-action="grow"
              placeholder={errors.msisdn || "07xxxxxxxx"}
              onChange={(ev) => onFieldChanged(ev)}
              value={values.msisdn}
              autoComplete="tel"
            />
          </div>
          <div className="sc-login-field">
            <label className="sc-login-label" htmlFor="sc-login-password">
              Password
            </label>
            <div className="sc-login-password-wrap">
              <input
                type={showPassword ? "text" : "password"}
                id="sc-login-password"
                name="password"
                className={`sc-login-input ${
                  errors.password ? "is-invalid" : ""
                }`}
                data-action="grow"
                placeholder={errors.password || "Password"}
                onChange={(ev) => onFieldChanged(ev)}
                onKeyPress={handleKeyPress}
                value={values.password}
                autoComplete="current-password"
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
          <label className="sc-login-remember">
            <input type="checkbox" name="remember" value="1" />
            <span>Remember me</span>
          </label>
          {alertVerifyMessage && (
            <div className="sc-login-alert-block">
              <Alert message={alertVerifyMessage} />
              <div
                onClick={() =>
                  dispatch({ type: "DEL", key: "showloginmodal" })
                }
              >
                <Link
                  className="sc-login-link sc-login-link--warn"
                  to={"/verify-account"}
                >
                  Click here to verify
                </Link>
              </div>
            </div>
          )}
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
                dispatch({
                  type: "SET",
                  key: "showloginmodal",
                  payload: false,
                });
                dispatch({ type: "DEL", key: "authModalMode" });
              }}
            >
              Cancel
            </button>
            <button
              className="sc-login-btn sc-login-btn--primary"
              type="submit"
            >
              {isLoading ? <span>Logging In …</span> : <span>Login</span>}
            </button>
          </div>
          <button
            type="button"
            className="sc-login-link-btn"
            onClick={() => navigateAway("/forgot-password")}
          >
            Forgot Password
          </button>
          <button
            type="button"
            className="sc-login-link-btn sc-login-link-btn--muted"
            onClick={() => {
              dispatch({ type: "SET", key: "authModalMode", payload: "register" });
              dispatch({ type: "SET", key: "showloginmodal", payload: true });
            }}
          >
            Don&apos;t have an account? Register now
          </button>
        </Row>
      </Form>
    </div>
  );
});

const BodyLogin = (props) => {
  const {
    setUser,
    dispatch,
    isModalOpen,
    sessionMessage,
    contextUser,
  } = props;
  const [isLoading, setIsLoading] = useState(null);
  const [message, setMessage] = useState(null);
  const [generalErrorMessage, setGeneralErrorMessage] = useState(null);
  const [user, setLocalUser] = useState(() => getFromLocalStorage("user"));
  const [alertVerifyMessage, setAlertVerifyMessage] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const initialValues = {
    msisdn: "",
    password: "",
  };

  // Re-sync when modal opens or context user is cleared (e.g. socket session expired)
  useEffect(() => {
    if (isModalOpen) {
      setLocalUser(getFromLocalStorage("user"));
    }
  }, [isModalOpen, contextUser, sessionMessage]);

  const Notify = useCallback(
    (loginMessage) => {
      if (![200, 201, 204].includes(loginMessage.status)) return;

      // Persist login without session TTL / expiry
      setLocalStorage("user", loginMessage.user);
      setLocalUser(loginMessage.user);

      if (isModalOpen && typeof setUser === "function") {
        setUser(loginMessage.user);
      }
      dispatch({ type: "DEL", key: "showloginmodal" });
      dispatch({ type: "DEL", key: "authModalMode" });
      dispatch({ type: "DEL", key: "sessionMessage" });

      if (navigateAwayRoutes.includes(location.pathname)) {
        const queryParams = new URLSearchParams(location.search);
        const next = queryParams.get("next") || "/";
        if (typeof navigate === "function") {
          navigate(next);
        } else {
          window.location.href = next;
        }
      }
    },
    [dispatch, location.pathname, location.search, navigate, setUser, isModalOpen]
  );

  useEffect(() => {
    if (message !== null) {
      Notify(message);
    }
  }, [message, Notify]);

  const handleSubmit = (values) => {
    setIsLoading(true);
    makeRequest({
      url: "auth/login",
      method: "POST",
      data: buildSurecoinCredentialsPayload(values),
      api_version: "sureCoinPublic",
    }).then(([status, response]) => {
      if (status == 200 || status == 201 || status == 204) {
        if (response.status == 200 || response.status == 201) {
          setMessage({ user: response?.data, status: 200 });
        } else if (response?.result == "User account not verified") {
          dispatch({ type: "SET", key: "regmsisdn", payload: values.msisdn });
          setAlertVerifyMessage({ status: 400, message: response.result });
        } else {
          setGeneralErrorMessage({ status: 400, message: response.result });
        }
      } else {
        if (status == 403 && response?.result == "Failed") {
          setGeneralErrorMessage({
            status: 400,
            message: response.error.description,
          });
        }
        if (response?.result == "User account not verified") {
          setAlertVerifyMessage({ status: 400, message: response.result });
        } else {
          setAlertVerifyMessage({ status: 400, message: response.result });
        }
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
      errors.password = "Invalid password";
    }
    return errors;
  };

  const navigateAway = useCallback(
    (url) => {
      navigate(url);
    },
    [navigate]
  );

  return (
    <>
      {user && (
        <div className="sc-login-already">
          <div className="sc-login-already__title">
            You are already logged in.
          </div>
          <div className="sc-login-already__actions">
            <Link to={"/game"} className="sc-login-btn sc-login-btn--ghost">
              Go Home
            </Link>
            <Link to={"/logout"} className="sc-login-btn sc-login-btn--danger">
              Logout
            </Link>
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
            <LoginFormFields
              {...formProps}
              isLoading={isLoading}
              sessionMessage={sessionMessage}
              alertVerifyMessage={alertVerifyMessage}
              generalErrorMessage={generalErrorMessage}
              dispatch={dispatch}
              navigateAway={navigateAway}
            />
          )}
        </Formik>
      )}
    </>
  );
};

export default React.memo(BodyLogin);
