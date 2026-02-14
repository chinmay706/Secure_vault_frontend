import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  ApolloLink,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";

// Read environment variables
const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL as string;

if (!GRAPHQL_URL) {
  throw new Error("VITE_GRAPHQL_URL is not defined in environment variables");
}

// HTTP link for GraphQL endpoint
const httpLink = createHttpLink({
  uri: GRAPHQL_URL,
});

// Auth link to inject JWT token from localStorage
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem("sv.auth.token") || "";
  return {
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
});

// Error link for comprehensive error logging
const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors?.length) {
    // graphQLErrors.forEach((e) => {
    //   console.error(`[GQL] error`, {
    //     op: operation.operationName,
    //     path: e.path,
    //     code: (e.extensions as Record<string, unknown>)?.code,
    //     message: e.message,
    //   });
    // });
  }
  if (networkError) {
    // console.error(`[GQL] network`, {
    //   op: operation.operationName,
    //   networkError: networkError.message,
    // });
  }
});

// Create Apollo Client with all middleware
export const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]), // Removed timingLink temporarily
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: "all",
    },
    query: {
      errorPolicy: "all",
    },
  },
});
