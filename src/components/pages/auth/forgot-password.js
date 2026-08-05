import React, { useState } from "react";
import { Formik, Form } from "formik";
import makeRequest from "../../utils/fetch-request";
import { useNavigate } from "react-router-dom";
import Notify from "../../utils/Notify";
import Alert from "../../utils/alert";

const ResetPassword = () => {
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const initialValues = {
    msisdn: "",
    password: "",
    repeat_password: "",
  };

  const handleSubmit = (values) => {
    setIsLoading(true);
    setMessage(null);
    makeRequest({
      url: "auth/reset-password",
      method: "POST",
      data: { msisdn: values.msisdn, password: values.password },
      api_version: "sureCoinPublic",
    }).then(([status, response]) => {
      setIsLoading(false);
      if ([200, 201].includes(status) && response?.status === 200) {
        Notify({ status: 200, message: "Password updated. Login to continue." });
        navigate("/game");
        return;
      }
      setMessage({
        status: 400,
        message:
          response?.error?.description ||
          response?.result ||
          response?.message ||
          "Unable to reset password",
      });
    });
  };

  const validate = (values) => {
    const errors = {};
    if (!values.msisdn || !values.msisdn.match(/(254|0|)?[71]\d{8}/g)) {
      errors.msisdn = "Please enter a valid phone number";
    }
    if (!values.password || values.password.length < 4) {
      errors.password = "Password must be at least 4 characters";
    }
    if (values.password !== values.repeat_password) {
      errors.repeat_password = "Passwords don't match";
    }
    return errors;
  };

  return (
    <div className="container py-4" style={{ maxWidth: 480 }}>
      <h4 className="mb-3 text-center">Reset Password</h4>
      {message && <Alert message={message} />}
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validate={validate}
        validateOnChange={false}
        validateOnBlur={false}
      >
        {({ values, errors, setFieldValue }) => (
          <Form>
            <div className="mb-3">
              <input
                className="form-control"
                name="msisdn"
                placeholder="07xxxxxxxx"
                value={values.msisdn}
                onChange={(e) => setFieldValue("msisdn", e.target.value)}
              />
              {errors.msisdn && <div className="text-danger">{errors.msisdn}</div>}
            </div>
            <div className="mb-3">
              <input
                className="form-control"
                type="password"
                name="password"
                placeholder="New password"
                value={values.password}
                onChange={(e) => setFieldValue("password", e.target.value)}
              />
              {errors.password && <div className="text-danger">{errors.password}</div>}
            </div>
            <div className="mb-3">
              <input
                className="form-control"
                type="password"
                name="repeat_password"
                placeholder="Repeat password"
                value={values.repeat_password}
                onChange={(e) => setFieldValue("repeat_password", e.target.value)}
              />
              {errors.repeat_password && (
                <div className="text-danger">{errors.repeat_password}</div>
              )}
            </div>
            <button className="btn btn-primary w-100" type="submit" disabled={isLoading}>
              {isLoading ? "Saving…" : "Reset Password"}
            </button>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default ResetPassword;
