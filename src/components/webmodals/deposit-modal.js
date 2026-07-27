import React, {useState, useContext, useEffect} from 'react';
import {Formik, Form} from 'formik';
import mpesa from '../../assets/img/mpesa.png'
import {Context} from '../../context/store';
import { Modal } from "react-bootstrap";
import makeRequest from '../utils/fetch-request';
import Alert from '../utils/alert';
import { getFromLocalStorage } from '../utils/local-storage';

const DepositModal = () => {
    const [state, dispatch] = useContext(Context);
    const [depositMessage, setDepositMessage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const user = state?.user || getFromLocalStorage("user");

    const initialValues = {
        amount: state?.promptdepositrequest?.payableAmt || 50,
        msisdn: user?.msisdn || ''
    }

    useEffect(() => {
        setDepositMessage(state?.promptdepositrequest?.message || null);
    }, [state?.promptdepositrequest?.message]);

    const handleSubmit = values => {
        let endpoint = '/v2/deposits/stk/new';
        setIsLoading(true);
        setDepositMessage(null);
        makeRequest({url: endpoint, method: 'POST', data: values, api_version:3}).then(([status, response]) => {
            setIsLoading(false);
            if(status == 200) {
                setDepositMessage({status: 200, message: "Check your phone and enter pin to complete deposit"})
            } else {
                setDepositMessage({status: 400, message: response?.result || "Error pushing STK. Please try again"});
            }
        })
    }

    const validate = values => {
        let errors = {}
        if (!values.msisdn || !String(values.msisdn).match(/(254|0|)?[71]\d{8}/g)) {
            errors.msisdn = 'Please enter a valid phone number'
        }
        const minAmt = state?.promptdepositrequest?.payableAmt || 10;
        if (!values.amount || values.amount < minAmt || values.amount > 70000) {
            errors.amount = `Please enter amount between KES ${minAmt} and KES 70,000.00`;
        }
        return errors
    }

    const MyDepositForm = ({errors, values, setFieldValue}) => {
        const onFieldChanged = (ev) => {
            setFieldValue(ev.target.name, ev.target.value);
        }

        return (
            <Form className="rounded border-0">
                <div className="pt-0">
                    <div className="row px-3">
                        <div className='text-center'>
                            <img src={mpesa} alt="M-Pesa"/>
                        </div>
                    </div>
                    <hr className='my-2'/>
                    {depositMessage && <div className='my-3 font-bold'><Alert message={depositMessage} font={"light"}/></div> }
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
                                    placeholder='Enter Amount'
                                />
                                {errors.amount && <div className='text-danger'> {errors.amount} </div>}
                            </div>
                            <input type="hidden" name="msisdn" value={values.msisdn} />
                            {!user?.msisdn && (
                                <div className="mt-2">
                                    <input
                                        onChange={onFieldChanged}
                                        className="text-dark deposit-input form-control input-field"
                                        id="msisdn"
                                        name="msisdn"
                                        type="text"
                                        value={values.msisdn}
                                        placeholder='07xxxxxxxx'
                                    />
                                    {errors.msisdn && <div className='text-danger'> {errors.msisdn} </div>}
                                </div>
                            )}
                            <div className='col-8 mt-3'>
                                <button
                                    disabled={isLoading}
                                    type="submit"
                                    className='w-full btn btn-lg btn-primary bg-primary deposit-withdraw-butto font-[500]'>
                                    {isLoading ? "wait..." : "Deposit"}
                                </button>
                            </div>
                            <div className='col-4 mt-3'>
                                <div
                                    onClick={() => dispatch({type:"DEL", key:"promptdepositrequest"})}
                                    className='w-full btn btn-lg btn-warning deposit-withdraw-butto font-[500]'>
                                    Close
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Form>
        );
    }

    return (
        <Modal
            show={state?.promptdepositrequest?.show}
            onHide={() => dispatch({type:"DEL", key:"promptdepositrequest"})}
            dialogClassName="popover-login-modal"
            aria-labelledby="contained-modal-title-vcenter"
        >
            <Modal.Body className="p-4">
                <Alert message={{status:400, message: "Insufficient Balance — Deposit to continue"}} />
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
    )
}

export default DepositModal
