const Reducer = (state,  action) => {
    let key = action.key;
    switch (action.type) {
        case 'SET':
            // Skip no-op writes so coin flags like iscoinrotating don't
            // notify every Context consumer when the value is unchanged.
            if (state[key] === action.payload) {
                return state;
            }
            return {
                ...state,
               [key]: action.payload
            };

        case 'OVERRIDE':
            return {
                ...state,
               ...action.payload
            };
        case 'DEL':
            const { [key]: foo, ...rest } = state;
            state = rest;
            return state;
        default:
            return state;
    }
};

export default Reducer;
