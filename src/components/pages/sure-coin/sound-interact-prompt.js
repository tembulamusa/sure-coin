import React from "react";
import { unlockSurecoinAudio } from "../../utils/surecoin-sound";

const SoundInteractPrompt = (props) => {
    const { setUserMuted, setUserSoundSet } = props;

    const enableSound = async (event) => {
        event.stopPropagation();
        await unlockSurecoinAudio();
        setUserMuted(false);
        setUserSoundSet(true);
    };

    const disableSound = (event) => {
        event.stopPropagation();
        setUserMuted(true);
        setUserSoundSet(true);
    };

    return (
        <>
            <div className="sound-interact-prompt-cover">
                <div className="sound-selector mx-auto text-center">
                    <div className="py-3 text-3xl">Enable Sound?</div>
                    <div className="uppercase">
                        <button
                            type="button"
                            className="btn btn-success rounded-md mr-3 px-3xl"
                            onClick={enableSound}
                        >
                            Yes
                        </button>
                        <button
                            type="button"
                            className="btn btn-danger rounded-md"
                            onClick={disableSound}
                        >
                            No
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default React.memo(SoundInteractPrompt);