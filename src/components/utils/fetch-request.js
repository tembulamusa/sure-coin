import {setLocalStorage, getFromLocalStorage, removeItem} from './local-storage';

const ENC_KEY = '2bdVweTeI42s5mkLdYHyklTMxQS5gLA7MDS6FA9cs1uobDXeruACDic0YSU3si04JGZe4Y';
const BASE_URL = process.env.REACT_APP_BASE_URL;
const BASE2_URL = process.env.REACT_APP_BASE2_URL;
const ACCOUNTS_URL = process.env.REACT_APP_ACCOUNTS_URL;
const CASINOGAMES = process.env.REACT_APP_CASINO_URL;
const CASINOGAMELaunch = process.env.REACT_APP_CASINO_LAUNCH_URL;
const CASINOFAZI = process.env.REACT_APP_CASINOFAZI_URL;
const SURECOIN_URL = process.env.REACT_APP_SURECOIN_URL;
const SURECOIN_PUBLIC_URL = process.env.REACT_APP_SURECOIN_PUBLIC_URL || SURECOIN_URL?.replace(/\/user\/?$/, "/");
const SUREBOX_URL = process.env.REACT_APP_SUREBOX_URL;
const PRAGMATIC_JACKPOT_URL = process.env.REACT_APP_PRAGMATIC_JACKPOT_URL;
const AVIATRIX_URL = process.env.REACT_APP_AVIATRIX_URL;
const CASINO_INTOUCHVAS_URL = process.env.REACT_APP_INTOUCHVAS_URL; // split the pot casino
const CASINO_PRAGMATIC_URL = process.env.REACT_APP_PRAGMATIC_URL; // pragmatic
const CASINO_SMARTSOFT_URL = process.env.REACT_APP_SMARTSOFT_URL; // smartsoft

const makeRequest = async ({url, method, data = null, use_jwt = false, api_version = 1, responseType = "json"}) => {
    // const 
    if (api_version == 2) {        
        url = BASE2_URL + url;
    } else { 
        if (api_version == 3) {
            url = ACCOUNTS_URL + url
        } else {
            if (api_version == "sureCoin") {
                url = SURECOIN_URL + url;
            } else if (api_version == "sureCoinPublic") {
                url = SURECOIN_PUBLIC_URL + url.replace(/^\//, "");
            } else if (api_version == "sureBox") {
                url = SUREBOX_URL + url;
            } else if (api_version == "casinoGames") {
                url = CASINOGAMES + url;
            } else if (api_version == "CasinoGameLaunch") {
                url = CASINOGAMELaunch + url;
            } else if (api_version == "casinoJackpots") {
                url = PRAGMATIC_JACKPOT_URL + url;  
            }
        }
    }
    let headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "origin":"surebet.co.ke"
    };

    let user = getFromLocalStorage('user');

    

    const token = user?.token;    
    if (token) {
        headers = {...headers, ...{Authorization: "Bearer " + token}}
    }

    try {
        let request = {
            method: method,
            mode: 'cors',
            cache: 'no-cache',
            // credentials: 'same-origin',
            headers: headers,
            redirect: 'follow',
            // referrerPolicy: 'no-referrer',
        }
        if (data) {
            request['body'] = JSON.stringify(data)
        }
        const response = await fetch(url, request);
        let result;
        if (responseType == "text") {
            result = await response?.text()
        } else {
            result = await response?.json();
        }
        let status = response?.status;
        return [status, result];
    } catch (err) {
        let status = err.response?.status,
            result = err.response?.data;
        return [status, result]
    } finally {
        // updateUserSession();
    }
};

export default makeRequest;
