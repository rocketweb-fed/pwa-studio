import { useCallback, useMemo, useState } from 'react';
import { useMutation } from '@apollo/react-hooks';
import { useUserContext } from '@magento/peregrine/lib/context/user';
import { useCartContext } from '@magento/peregrine/lib/context/cart';

/**
 * Returns props necessary to render CreateAccount component. In particular this
 * talon handles the submission flow by first doing a pre-submisson validation
 * and then, on success, invokes the `onSubmit` prop, which is usually the action.
 *
 * @param {Object} props.initialValues initial values to sanitize and seed the form
 * @param {Function} props.onSubmit the post submit callback
 * @param {String} createAccountQuery the graphql query for creating the account
 * @param {String} signInQuery the graphql query for logging in the user (and obtaining the token)
 * @returns {{
 *   errors: array,
 *   handleSubmit: function,
 *   isDisabled: boolean,
 *   isSignedIn: boolean,
 *   initialValues: object
 * }}
 */
export const useCreateAccount = props => {
    const {
        initialValues = {},
        onSubmit,
        createAccountQuery,
        signInQuery
    } = props;

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [, { getCartDetails, removeCart }] = useCartContext();
    const [
        { isSignedIn },
        { actions: userActions, setToken }
    ] = useUserContext();
    const [createAccount, { error: createAccountError }] = useMutation(
        createAccountQuery
    );
    const [signIn, { error: signInError }] = useMutation(signInQuery);

    const errors = [];
    if (createAccountError) {
        errors.push(createAccountError.graphQLErrors[0]);
    }
    if (signInError) {
        errors.push(signInError.graphQLErrors[0]);
    }

    const handleSubmit = useCallback(
        async formValues => {
            setIsSubmitting(true);
            try {
                // Try to create an account with the mutation.
                const {
                    data: { createCustomer: createAccountData }
                } = await createAccount({
                    variables: {
                        email: formValues.customer.email,
                        firstname: formValues.customer.firstname,
                        lastname: formValues.customer.lastname,
                        password: formValues.password
                    }
                });

                // Update global store with customer data
                userActions.getDetails.receive(createAccountData.customer);

                // Sign in and save the token
                const signInResponse = await signIn({
                    variables: {
                        email: formValues.customer.email,
                        password: formValues.password
                    }
                });

                const token =
                    signInResponse &&
                    signInResponse.data.generateCustomerToken.token;

                setToken(token);

                // Then reset the cart
                await removeCart();
                await getCartDetails({ forceRefresh: true });

                // Finally, invoke the post-submission callback.
                onSubmit();
            } catch (error) {
                if (process.env.NODE_ENV === 'development') {
                    console.error(error);
                }
                setIsSubmitting(false);
            }
        },
        [
            createAccount,
            getCartDetails,
            onSubmit,
            removeCart,
            setToken,
            signIn,
            userActions.getDetails
        ]
    );

    const sanitizedInitialValues = useMemo(() => {
        const { email, firstName, lastName, ...rest } = initialValues;

        return {
            customer: { email, firstname: firstName, lastname: lastName },
            ...rest
        };
    }, [initialValues]);

    return {
        errors,
        handleSubmit,
        isDisabled: isSubmitting,
        isSignedIn,
        initialValues: sanitizedInitialValues
    };
};
