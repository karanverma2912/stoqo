class AddDailyReportingIndexes < ActiveRecord::Migration[8.1]
  def change
    add_index :sales, [:business_id, :created_at, :id], name: "index_sales_for_daily_reporting"
    add_index :sale_returns, [:business_id, :created_at, :id], name: "index_returns_for_daily_reporting"
  end
end
