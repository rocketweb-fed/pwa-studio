import { useCallback, useEffect, useState } from 'react';
import { useUserContext } from '../../context/user';
import { useApolloClient } from '@apollo/react-hooks';

const UNAUTHED_ONLY = ['CREATE_ACCOUNT', 'FORGOT_PASSWORD', 'SIGN_IN'];

/**
 * Returns props necessary to render an AuthModal component.
 *
 * @param {object} props
 * @param {function} props.closeDrawer - callback that closes drawer
 * @param {function} props.showCreateAccount - callback that shows create account view
 * @param {function} props.showForgotPassword - callback that shows forgot password view
 * @param {function} props.showMainMenu - callback that shows main menu view
 * @param {function} props.showMyAccount - callback that shows my account view
 * @return {{
 *  handleClose: function,
 *  handleCreateAccount: function,
 *  handleSignOut: function,
 *  setUsername: function,
 *  showCreateAccount: function,
 *  showForgotPassword: function,
 *  showMyAccount: function,
 *  username: string
 * }}
 */
export const useAuthModal = props => {
    const {
        closeDrawer,
        showCreateAccount,
        showForgotPassword,
        showMainMenu,
        showMyAccount,
        view
    } = props;

    const { resetStore } = useApolloClient();
    const [username, setUsername] = useState('');
    const [{ currentUser }, { signOut }] = useUserContext();

    // If the user is authed, the only valid view is "MY_ACCOUNT".
    // view an also be `MENU` but in that case we don't want to act.
    useEffect(() => {
        if (currentUser && currentUser.id && UNAUTHED_ONLY.includes(view)) {
            showMyAccount();
        }
    }, [currentUser, showMyAccount, view]);

    const handleClose = useCallback(() => {
        showMainMenu();
        closeDrawer();
    }, [closeDrawer, showMainMenu]);

    const handleCreateAccount = useCallback(() => {
        showMyAccount();
    }, [showMyAccount]);

    const handleSignOut = useCallback(() => {
        // After logout, reset the store to set the bearer token.
        // https://www.apollographql.com/docs/react/networking/authentication/#reset-store-on-logout
        resetStore();

        // TODO: Get history from router context when implemented.
        signOut({ history: window.history });
    }, [resetStore, signOut]);

    return {
        handleClose,
        handleCreateAccount,
        handleSignOut,
        setUsername,
        showCreateAccount,
        showForgotPassword,
        showMyAccount,
        username
    };
};
