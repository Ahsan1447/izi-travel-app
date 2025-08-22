import { useState, useCallback } from 'react';

const API_ENDPOINT = "http://client-private-api-stage.izi.travel/graphql";
const API_HEADERS = {
  Accept: "application/izi-client-private-api-v1.0+json",
  "X-IZI-API-KEY": "350e8400-e29b-41d4-a716-446655440003",
  "Content-Type": "application/json",
};

const DETAILS_MUTATION = `
  mutation DetailsMutation($input: DetailsMutationInput!) {
    mtgObjectDetails(input: $input) {
      mtgObjectDetail {
        status
        type
        title
        uuid
        language
        description
        userLimit
        location{
          latitude
          longitude
        }
        images {
          url
        }
        content {
          audio {
            url
          }
        }
      }
    }
  }
`;

const BULK_DETAILS_MUTATION = `
  mutation DetailsBatchMutation($input: DetailsBatchMutationInput!) {
    bulkMtgObjectDetails(input: $input) {
      data {
        status
        type
        title
        uuid
        language
        affiliateLink
        description
        userLimit
        images { url }
        location{
            latitude
            longitude
          }
        content {
          audio { url }
          children {
            uuid
            language
            affiliateLink
            title
            description
            type
            images { url }
            content { audio { url } }
            location{
              latitude
              longitude
            }
            status
          }
        }
      }
    }
  }
`;

export function useApiOperations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchChildDetails = useCallback(async (child) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify({
          query: DETAILS_MUTATION,
          variables: {
            input: {
              uuid: child.uuid,
              languages: [child.language || "any"],
            },
          },
        }),
      });

      const { data, errors } = await response.json();

      if (errors) {
        throw new Error(errors[0]?.message || "Error fetching child details");
      }

      const childDetails = data?.mtgObjectDetails?.mtgObjectDetail;

      if (!childDetails) {
        throw new Error("No details found for this item");
      }

      return {
        ...childDetails,
        affiliateLink: childDetails.affiliateLink ?? child.affiliateLink
      };
    } catch (err) {
      setError(err.message || "Failed to fetch child details");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBulkDetails = useCallback(async (apiKey) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify({
          query: BULK_DETAILS_MUTATION,
          variables: { 
            input: { 
              widgetApiKey: apiKey, 
              filterChildren: true 
            } 
          },
        }),
      });

      const { data, errors } = await response.json();

      if (errors) {
        throw new Error(errors[0]?.message || "Error fetching bulk details");
      }

      const items = data?.bulkMtgObjectDetails?.data || [];
      const anyLimit = items.find((i) => typeof i?.userLimit !== "undefined");
      const limit =
        typeof anyLimit?.userLimit === "object"
          ? Boolean(anyLimit.userLimit?.limitReached)
          : Boolean(anyLimit?.userLimit);

      return {
        items: items.filter((r) => r && r.status === "published"),
        limitReached: limit
      };
    } catch (err) {
      setError(err.message || "Failed to fetch results");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    setError,
    fetchChildDetails,
    fetchBulkDetails
  };
}