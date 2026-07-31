export const getFromLocalStorage = (key) => {
    let entry = window.localStorage.getItem(key);
    if (!entry || entry == undefined || entry == "undefined") {
        return null;
    }
    try {
        let entry_data = JSON.parse(entry);
        // Prefer wrapped { value } shape; fall back to raw parsed value
        if (entry_data && typeof entry_data === "object" && "value" in entry_data) {
            return entry_data.value;
        }
        return entry_data;
    } catch {
        return entry;
    }
}

export const setLocalStorage = (key, value, _ttl) => {
    // Persist without session expiry — ttl arg kept for call-site compatibility
    window.localStorage.setItem(key, JSON.stringify({
        value: value
    }));
}
export const removeItem = (key) => {
    window.localStorage.removeItem(key);
}
