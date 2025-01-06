class Restaurant < ApplicationRecord
    validates :place_id, presence: true, uniqueness: true
end
