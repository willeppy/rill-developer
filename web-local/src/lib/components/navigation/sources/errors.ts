export function humanReadableErrorMessage(
  connectorName: string,
  code: number,
  message: string
) {
  const serverError = message;

  switch (code) {
    // gRPC error codes: https://pkg.go.dev/google.golang.org/grpc@v1.49.0/codes
    // InvalidArgument
    case 3: {
      // Rill errors
      if (
        serverError.match(/an existing object with name '.*' already exists/)
      ) {
        return "A source with this name already exists. Please choose a different name.";
      }

      // AWS errors (ref: https://docs.aws.amazon.com/AmazonS3/latest/API/ErrorResponses.html)
      if (connectorName === "s3") {
        if (serverError.includes("MissingRegion")) {
          return "Region not detected. Please enter a region.";
        } else if (serverError.includes("NoCredentialProviders")) {
          return "No credentials found. Please see the docs for how to configure AWS credentials.";
        } else if (serverError.includes("InvalidAccessKey")) {
          return "Invalid AWS access key. Please check your credentials.";
        } else if (serverError.includes("SignatureDoesNotMatch")) {
          return "Invalid AWS secret key. Please check your credentials.";
        } else if (serverError.includes("BucketRegionError")) {
          return "Bucket is not in the provided region. Please check your region.";
        } else if (serverError.includes("AccessDenied")) {
          return "Access denied. Please ensure you have the correct permissions.";
        } else if (serverError.includes("NoSuchKey")) {
          return "Invalid path. Please check your path.";
        } else if (serverError.includes("NoSuchBucket")) {
          return "Invalid bucket. Please check your bucket name.";
        } else if (serverError.includes("AuthorizationHeaderMalformed")) {
          return "Invalid authorization header. Please check your credentials.";
        }
      }

      // GCP errors (ref: https://cloud.google.com/storage/docs/json_api/v1/status-codes)
      if (connectorName === "gcs") {
        if (serverError.includes("could not find default credentials")) {
          return "No credentials found. Please see the docs for how to configure GCP credentials.";
        } else if (serverError.includes("Unauthorized")) {
          return "Unauthorized. Please check your credentials.";
        } else if (serverError.includes("AccessDenied")) {
          return "Access denied. Please ensure you have the correct permissions.";
        }
      }

      if (connectorName === "https") {
        if (serverError.includes("invalid file")) {
          return "The provided URL does not appear to have a valid dataset. Please check your path and try again.";
        } else if (serverError.includes("failed to fetch url")) {
          return "We could not connect to the provided URL. Please check your path and try again.";
        }
      }

      // DuckDB errors
      if (serverError.match(/expected \d* values per row, but got \d*/)) {
        return "Malformed CSV file: number of columns does not match header.";
      } else if (
        serverError.match(/Catalog Error: Table with name .* does not exist/)
      ) {
        return "We had trouble ingesting your data. Please see the docs for common issues. If you're still stuck, don't hesitate to reach out on Discord.";
      }
      return serverError;
    }
    default:
      return "An unknown error occurred. If the error persists, please reach out for help on <a href=https://bit.ly/3unvA05 target=_blank>Discord</a>.";
  }
}
