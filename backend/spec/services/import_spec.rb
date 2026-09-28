require "rails_helper"
RSpec.describe ProductImportJob do
  it "imports valid rows and reports invalid ones without aborting the file" do
    user = create(:user)
    business = create(:business)
    create(:business_membership, user: user, business: business)
    import = business.imports.create!(user: user)
    content = "Product Name,SKU,Quantity,Selling Price\nTea,T1,10,20\nBad,T2,-3,10\nCoffee,C1,4,30\n"
    import.file.attach(io: StringIO.new(content), filename: "products.csv", content_type: "text/csv")
    described_class.perform_now(import.id)
    expect(import.reload.status).to eq("completed")
    expect(import.imported_count).to eq(2)
    expect(import.row_errors.first["row"]).to eq(3)
    expect(business.products.count).to eq(2)
    expect(business.stock_movements.sum(:quantity)).to eq(14)
    described_class.perform_now(import.id)
    expect(business.products.count).to eq(2)
  end
end
