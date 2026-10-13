module Accounts
  class DeleteAccount
    def self.call(user:, password:, close_owned_stores:)
      user.with_lock do
        raise ArgumentError, "Your password is incorrect" unless user.authenticate(password.to_s)
        owned = user.business_memberships.where(role: "owner").pluck(:business_id)
        raise ArgumentError, "Confirm closure of your owned stores before deleting your account" if owned.any? && close_owned_stores != true
        Business.where(id: owned).order(:id).lock.each { |business| close_store!(business) }
        old_email = user.email
        user.sessions.destroy_all
        user.account_tokens.delete_all
        user.business_memberships.destroy_all
        AssistantConversation.where(user: user).delete_all
        AssistantAction.where(user: user).delete_all
        NotificationReceipt.where(user: user).delete_all
        TeamInvitation.where(email: old_email).update_all(email: "deleted-#{SecureRandom.uuid}@example.invalid", revoked_at: Time.current)
        Sale.where(user: user).update_all(cashier_name: "Deleted account")
        user.update!(name: "Deleted account", email: "deleted-#{SecureRandom.uuid}@example.invalid", phone: nil, email_verified_at: nil, status: "deleted", password: SecureRandom.hex(24), password_confirmation: nil)
      end
    end
    def self.close_store!(business)
      products = Product.where(business: business).select(:id)
      imports = Import.where(business: business).select(:id)
      attachments = ActiveStorage::Attachment.where(record_type: "Product", record_id: products).or(ActiveStorage::Attachment.where(record_type: "Import", record_id: imports))
      blobs = attachments.pluck(:blob_id)
      attachments.delete_all
      notifications = Notification.where(business: business).select(:id)
      PushDelivery.where(notification_id: notifications).delete_all
      NotificationReceipt.where(notification_id: notifications).delete_all
      SaleReturnItem.where(sale_id: Sale.where(business: business).select(:id)).delete_all
      [SaleReturn, SaleItem, Sale, StockMovement, ProductCreationRequest, ProductSetupBatch, AssistantAction, AssistantConversation, AiDailyBudget, SubscriptionRequest, Activity, Notification, Import, TeamInvitation].each { |model| model.where(business: business).delete_all }
      Product.where(business: business).delete_all
      [ProductGroup, Supplier, Category, BusinessMembership].each { |model| model.where(business: business).delete_all }
      business.destroy!
      ActiveStorage::Blob.where(id: blobs).find_each { |blob| blob.purge_later unless blob.attachments.exists? }
    end
  end
end
