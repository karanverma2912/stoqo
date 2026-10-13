require "active_storage/service"
require "digest"
class ActiveStorage::Service::DatabaseService < ActiveStorage::Service
  def initialize(**) = super()
  def upload(key, io, checksum: nil, **)
    bytes = io.read(5.megabytes + 1).to_s
    raise ActiveStorage::IntegrityError, "File exceeds 5 MB" if bytes.bytesize > 5.megabytes
    if checksum && Digest::MD5.base64digest(bytes) != checksum
      raise ActiveStorage::IntegrityError, "Checksum mismatch"
    end
    StoredFile.transaction do
      StoredFile.connection.execute("SELECT pg_advisory_xact_lock(746071)")
      used = StoredFile.sum("octet_length(data)")
      old = StoredFile.find_by(key: key)
      raise ActiveStorage::IntegrityError, "Store upload capacity reached" if used - (old&.data&.bytesize || 0) + bytes.bytesize > ENV.fetch("UPLOAD_DATABASE_LIMIT_BYTES", 100.megabytes).to_i
      (old || StoredFile.new(key: key)).update!(data: bytes)
    end
  end
  def download(key)
    bytes = StoredFile.find_by(key: key)&.data
    raise ActiveStorage::FileNotFoundError unless bytes
    block_given? ? yield(bytes) : bytes
  end
  def download_chunk(key, range) = download(key).byteslice(range)
  def exist?(key) = StoredFile.exists?(key: key)
  def delete(key) = StoredFile.where(key: key).delete_all
  def delete_prefixed(prefix)
    StoredFile.where("key LIKE ?", "#{StoredFile.sanitize_sql_like(prefix)}%").delete_all
  end
  def url(*) = raise(NotImplementedError, "Use Stoqo's authenticated image endpoint")
end
