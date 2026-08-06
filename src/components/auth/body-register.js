import React, { useState, useContext, useCallback, useEffect } from "react";
import Row from "react-bootstrap/Row";
import { Formik, Form } from "formik";
import makeRequest from "../utils/fetch-request";
import { Context } from "../../context/store";
import { getFromLocalStorage, setLocalStorage } from "../utils/local-storage";
import Alert from "../utils/alert";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";

const BodyRegister = (props) => {
  const { setUser } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [generalErrorMessage, setGeneralErrorMessage] = useState(null);
  const [state, dispatch] = useContext(Context);
  const [user, setLocalUser] = useState(() => getFromLocalStorage("user"));

  const initialValues = {
    msisdn: "",
    displayName: "",
    password: "",
    password2: "",
  };

  useEffect(() => {
    if (state?.showloginmodal == true) {
      setLocalUser(getFromLocalStorage("user"));
    }
  }, [state?.showloginmodal, state?.user]);

  const Notify = useCallback(
    (signupMessage) => {
      if (![200, 201, 204].includes(signupMessage.status)) return;

      setLocalStorage("user", signupMessage.user);
      setLocalUser(signupMessage.user);

      if (state?.showloginmodal == true && typeof setUser === "function") {
        setUser(signupMessage.user);
      }
      dispatch({ type: "DEL", key: "showloginmodal" });
      dispatch({ type: "DEL", key: "authModalMode" });
      dispatch({ type: "DEL", key: "sessionMessage" });
    },
    [dispatch, setUser, state?.showloginmodal]
  );

  useEffect(() => {
    if (message !== null) {
      Notify(message);
    }
  }, [message, Notify]);

  const handleSubmit = (values) => {
    setIsLoading(true);
    setGeneralErrorMessage(null);

    const data = {
      msisdn: values.msisdn.trim(),
      password: values.password,
    };
    if (values.displayName?.trim()) {
      data.displayName = values.displayName.trim();
    }

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
    if (!values.msisdn || !values.msisdn.match(/(254|0|)?[71]\d{8}/g)) {
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

  const openLogin = () => {
    dispatch({ type: "SET", key: "authModalMode", payload: "login" });
    dispatch({ type: "SET", key: "showloginmodal", payload: true });
  };

  const MyRegisterForm = (formProps) => {
    const { errors, values, submitForm, setFieldValue } = formProps;
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
  };

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
          {(formProps) => <MyRegisterForm {...formProps} />}
        </Formik>
      )}
    </>
  );
};

export default React.memo(BodyRegister);
