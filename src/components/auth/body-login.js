import React, {useState, useEffect, useContext, useCallback} from 'react'
import Row from 'react-bootstrap/Row';
import Container from 'react-bootstrap/Container';
import {Formik, Field, Form} from 'formik';
import makeRequest from "../utils/fetch-request";
import {Context} from '../../context/store';
import {toast, ToastContainer} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {getFromLocalStorage, setLocalStorage} from '../utils/local-storage';
import {
    Link,
    useLocation,
    useNavigate,
} from 'react-router-dom';
import Alert from '../utils/alert';
import { FaRegEye, FaRegEyeSlash  } from "react-icons/fa";

const BodyLogin = (props) => {
    const {setUser} = props
    const [isLoading, setIsLoading] = useState(null)
    const [message, setMessage] = useState(null);
    const [generalErrorMessage, setGeneralErrorMessage] = useState(null)
    const [state, dispatch] = useContext(Context);
    const [user, ] = useState(getFromLocalStorage("user"))
    const [alertVerifyMessage, setAlertVerifyMessage] = useState(null)
    const navigate = useNavigate();
    const location = useLocation();
    const navigateAwayRoutes = ['/login', '/signup', ]
    
    const initialValues = {
        msisdn: "",
        password: ""
    }

    const Notify = (message) => {
        let options = {
            autoClose: 5000,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            toastId: 673738 /* this is hack to prevent multiple toasts */
        }
        if ([200, 201, 204].includes(message.status)) {
            //setLocalStorage('user', message.user, 1000 * 60 * 60 * 24 * 30);
            setLocalStorage('user', message.user, 1000 * 60 * 60 * 3);

            if(state?.showloginmodal == true) {
                if (typeof setUser === 'function') {
                    setUser(message.user);
                }
            }
            // toast.success(`🚀 ${message.message || "Login successful"}`, options);
            dispatch({type:"DEL", key:"showloginmodal"});
            if(navigateAwayRoutes.includes(location.pathname)) {
                const queryParams = new URLSearchParams(location.search);
                const next = queryParams.get('next') || '/';
                
                if (typeof navigate === 'function') {
                    navigate(next);
                } else {
                    window.location.href = next;
                }


            }

        }

    };

    const dispatchUser = useCallback(() => {
        if (message !== null) {
            Notify(message);
        }
    }, [message])

    useEffect(() => {
        dispatchUser();
    }, [dispatchUser]);

    const handleSubmit = values => {
        let endpoint = '/v2/auth/login';
        setIsLoading(true)
        makeRequest({url: endpoint, method: 'POST', data: values, api_version:2}).then(([status, response]) => {
            if (status == 200 || status == 201 || status == 204) {
                if (response.status == 200 || response.status == 201) {
                    setMessage({user:response?.data, status:200});
                } else {
                    if (response?.result == "User account not verified") {
                        dispatch({type:"SET", key:"regmsisdn", payload:values.msisdn})
                        setAlertVerifyMessage({status: 400, message:response.result})
                    } else {
                        setGeneralErrorMessage({status: 400, message:response.result})
                    }
                }
            } else {
                if (status == 403) {
                    if (response?.result == "Failed") {
                        setGeneralErrorMessage({status: 400, message: response.error.description})
                    }
                }
                if (response?.result == "User account not verified") {
                    setAlertVerifyMessage({status: 400, message:response.result})
                } else {
                    //setAlertVerifyMessage({status: 400, message:"An error occurred. Check details"})
                    setAlertVerifyMessage({status: 400,  message:response.result})

                }

            }

            setIsLoading(false)
        })
    }


    const validate = values => {

        let errors = {}

        if (!values.msisdn || !values.msisdn.match(/(254|0|)?[71]\d{8}/g)) {
            errors.msisdn = 'Invalid phone number'
        }

        if (!values.password || values.password.length < 4) {
            errors.password = "Invalid password";
        }

        return errors
    }

    useEffect(() => {
        // if (user) {
        //     navigate("/")
        // }
    }, [])

    const navigateAway = (url) => {
        navigate(url)
    }
    const MyLoginForm = (props) => {
        const {isValid, errors, values, submitForm, setFieldValue} = props;
        const [showPassword, setShowPassword] = useState(false);

        const onFieldChanged = (ev) => {
            let field = ev.target.name;
            let value = ev.target.value;
            if(field == "msisdn") {
                value = value.trim();
            }
            setFieldValue(field, value);
        }

        const handleKeyPress = (event) => {
            if (event.key == 'Enter') {
                event.preventDefault(); 
                submitForm(); 
            }
        }

        return (
            <div className='mt-5 mx-auto w-11/12' style={{ maxWidth: '600px'}}>
                <Form className="">
                    {state?.sessionMessage 
                    && 
                    <div className='alert alert-warning my-4'>
                        {state?.sessionMessage}
                    </div>
                    }
                    <Row>
                        <div className="px-0">
                            <label className='modal-label'>Mobile Phone</label>
                            <input type="text"
                                name="msisdn"
                                className={`form-control block px-3 py-3 w-full rounded-2xl std-input ${errors.msisdn && 'text-danger'} `}
                                data-action="grow"
                                placeholder={errors.msisdn || "07xxxxxxxx"}
                                onChange={ev => onFieldChanged(ev)}
                                value={values.msisdn}
                            />
                            <br/>
                            
                        </div>
                        <div className="px-0">
                            <label className='modal-label'>Password</label>
                            <div className="relative">
                                <input type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    className={`block px-3 py-3 w-full rounded-2xl form-control std-input ${errors.password && 'text-danger'} `}
                                    data-action="grow"
                                    placeholder={errors.password || "Password"}
                                    onChange={ev => onFieldChanged(ev)}
                                    onKeyPress={handleKeyPress}
                                    value={values.password}
                                />
                                <span
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer text-xl"
                                    onClick={() => setShowPassword(!showPassword)}
                                    onKeyPress={handleKeyPress}
                                >
                                    {showPassword ? <FaRegEye /> : <FaRegEyeSlash />}
                                </span>
                            </div>
                            <br />
                            <input type="hidden" name="ref" value="{props.refURL}" />
                        </div>
                        <span className="px-0">
                            <label><input type="checkbox" name="remember" value="1"/>Remember me</label>
                        </span>
                        {
                            alertVerifyMessage &&
                            <div><Alert message={alertVerifyMessage}/> <div onClick={() => dispatch({type:"DEL", key:"showloginmodal"})}>
                                <Link className='text-red-500 underline font-bold' to={"/verify-account"}>Click here to verify</Link>
                                </div>
                            </div>
                        }

                        {
                            generalErrorMessage && 
                            <div><Alert message={generalErrorMessage}/></div>
                        }
                        <div className='row !pr-0 px-0 !mr-0'>
                            <div className='col-3'><button className='mt-4 btn btn-default btn-lg bg-gray-200 hover:bg-gray-300'  style={{marginTop: "10px",
                            padding: "8px 12px", fontSize: "14px"}} onClick={() => dispatch({type:"SET", key:"showloginmodal", payload:false})}>Cancel</button></div>
                            <div className='col-9 !pr-0'>
                                <button
                                className={`btn btn-lg btn-primary mt-4 deposit-withdraw-button`}
                                type="submit" style={{marginTop: "10px",
                            padding: "5px", fontSize: "14px"}}>
                                    {isLoading ? <span>Logging In ...</span> : <span>Login</span>}
                                    </button>
                            </div>
                        </div>        

                        <div className='cursor-pointer px-0 mt-4 font-[500] hover:underline' to="/forgot-password" title="Forgot password" onClick={() => navigateAway("/forgot-password")}>
                            <span className="">Forgot Password</span>
                        </div>
                        <div className="my-5 px-0 cursor-pointer ">
                            <div className="capitalize font-bold text-gray-500 hover:text-gray-600 hover:underline"  onClick={() => navigateAway("/signup")}>
                                <span className="">Don't have an account? Register now!</span>
                            </div>
                        </div>
                    </Row>
                </Form>
            </div>
        );
    }

    const LoginForm = (props) => {
        return (
            <>
            {user &&
                <div className='px-2 text-center py-5'>
                    <div className='text-2xl'>You are already logged in.</div>
                    <div className='mt-2'>
                    <Link to={"/"} className='btn mr-3  w-[] btn-default rounded-md bg-gray-100'>Go Home</Link>
                    <Link to={"/logout"} className='btn btn-danger'>Logout</Link>
                    </div>
                </div>
            }
            {!user && <Formik
                initialValues={initialValues}
                onSubmit={handleSubmit}
                validateOnChange={false}
                validateOnBlur={false}
                validate={validate}
            >{(props) => <MyLoginForm {...props} />}</Formik> }
            </>
            
        );
    }

    return (
        <>
            {/* <ToastContainer/> */}
            <LoginForm/>
        </>
                
    )
}
export default React.memo(BodyLogin);