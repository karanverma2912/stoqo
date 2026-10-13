class Api::V1::ReleaseCredentialsController < ActionController::API
  def create
    return head(:not_found) unless ENV["RELEASE_SIGNING_ENABLED"] == "true"
    token = request.authorization.to_s.delete_prefix("Bearer ")
    claims = Releases::GithubIdentity.verify!(token)
    response.headers["Cache-Control"] = "no-store"
    ReleaseAccess.create!(run_id: claims.fetch("run_id"), commit_sha: claims.fetch("sha"))
    render json: Releases::AndroidSigning.credentials
  rescue Releases::GithubIdentity::Unauthorized
    head :unauthorized
  end
  def metadata
    return head(:not_found) unless ENV["RELEASE_SIGNING_ENABLED"] == "true"
    render json: Releases::AndroidSigning.metadata
  end
end
