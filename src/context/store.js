import { createContext, useReducer } from "react";
import Reducer from "./reducer";
import { SureCoinRoundProvider } from "./surecoin-round";
import { getFromLocalStorage } from "../components/utils/local-storage";

const initialState = {
    error: null,
    user: getFromLocalStorage("user"),
};

const Store = ({ children }) => {
    const [state, dispatch] = useReducer(Reducer, initialState);

    return (
        <Context.Provider value={[state, dispatch]}>
            <SureCoinRoundProvider>{children}</SureCoinRoundProvider>
        </Context.Provider>
    );
};

export const Context = createContext(initialState);
export default Store;
