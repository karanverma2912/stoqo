require "csv"
class ProductImportJob < ApplicationJob
  queue_as :default
  def perform(id)
    import = Import.find(id)
    import.with_lock do
      return if import.status == "completed"
      import.update!(status: "processing")
      count = 0
      errors = []
      import.file.open do |file|
        rows = if import.file.filename.extension.downcase == "csv"
          CSV.read(file.path, headers: true).map(&:to_h)
        else
          book = Roo::Excelx.new(file.path)
          headers = book.row(1).map(&:to_s)
          (2..book.last_row).map { |i| headers.zip(book.row(i)).to_h }
        end
        raise ArgumentError, "Import up to 5,000 rows at a time" if rows.size > 5000
        rows.each_with_index do |row, i|
          begin
            Product.transaction(requires_new: true) do
              category = import.business.categories.find_or_create_by!(name: row["Category"].to_s.strip) if row["Category"].present?
              Inventory::CreateProduct.call(business: import.business, user: import.user,
                attributes: {name: row["Product Name"], sku: row["SKU"], barcode: row["Barcode"], purchase_price: row["Purchase Price"].presence || 0,
                  selling_price: row["Selling Price"].presence || 0, low_stock_threshold: row["Low Stock Threshold"].presence || 5, category: category},
                initial_quantity: row["Quantity"].presence || 0)
            end
            count += 1
          rescue ActiveRecord::RecordInvalid, ActiveRecord::RecordNotUnique, Inventory::AdjustStock::InvalidMovement => e
            errors << {row: i + 2, message: e.is_a?(ActiveRecord::RecordNotUnique) ? "Duplicate SKU or barcode" : e.message}
          end
        end
      end
      import.update!(status: "completed", imported_count: count, row_errors: errors)
      import.business.notifications.create!(kind: "import_completed", message: "Imported #{count} products. #{errors.size} rows need attention.")
    end
  rescue StandardError => e
    Rails.logger.error("Import #{id} failed: #{e.class}")
    Import.find(id).update!(status: "failed", row_errors: [{message: "Unable to read the file. Check the template and try again."}])
    Import.find(id).business.notifications.create!(kind: "import_failed", message: "Your import could not be completed. Check the file and try again.")
  end
end
